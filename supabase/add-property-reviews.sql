-- ============================================================
-- STUDENT RATINGS FOR BOARDING HOUSES
-- ============================================================
-- Students rate the BOARDING HOUSE (not the landlord), and only a
-- student who actually boarded that property may leave or update a
-- rating. Everyone else can read the ratings but cannot write one.
--
-- A student "has boarded" when their tenancy row for the property is
-- still active (isActive = 1) or has already ended (status = 'ended').
-- Pending and rejected applications do NOT qualify.
--
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Idempotent: safe to re-run.
-- ============================================================

BEGIN;

-- Make sure the tenancy status column exists (older projects may not
-- have run supabase/add-tenancy-approval.sql yet).
ALTER TABLE public.tenancy
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS public.property_reviews (
  id TEXT PRIMARY KEY,
  "propertyId" TEXT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "studentName" TEXT,
  course TEXT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("propertyId", "userId")
);

CREATE INDEX IF NOT EXISTS idx_property_reviews_property
  ON public.property_reviews("propertyId");
CREATE INDEX IF NOT EXISTS idx_property_reviews_user
  ON public.property_reviews("userId");

-- Admin helper (same definition as full-setup.sql / rls-policies.sql). Safe to
-- re-create; needed by the delete policy below on older projects.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() -> 'user_metadata' ->> 'isAdmin')::boolean, false)
      OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin';
$$;

-- True only when the signed-in student actually boarded this property.
-- Uses jsonb access for `status` so the function still creates on a
-- database whose tenancy table predates the status column.
CREATE OR REPLACE FUNCTION public.has_boarded(prop_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.tenancy t
     WHERE t."propertyId" = prop_id
       AND (
         t."userId" = COALESCE(auth.uid()::text, '')
         OR t."userId" = COALESCE(
           (SELECT u.id
              FROM public.users u
             WHERE lower(u.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
             LIMIT 1),
           ''
         )
       )
       AND (
         t."isActive" = 1
         OR COALESCE(to_jsonb(t) ->> 'status', '') = 'ended'
       )
  );
$$;

ALTER TABLE public.property_reviews ENABLE ROW LEVEL SECURITY;

-- Ratings are public: guests and non-boarders may read them.
DROP POLICY IF EXISTS "property_reviews_select" ON public.property_reviews;
CREATE POLICY "property_reviews_select" ON public.property_reviews
  FOR SELECT USING (true);

-- Only a student who boarded this property may create a rating, and the
-- rating must be attached to their own account.
DROP POLICY IF EXISTS "property_reviews_insert" ON public.property_reviews;
CREATE POLICY "property_reviews_insert" ON public.property_reviews
  FOR INSERT WITH CHECK (
    "userId" = COALESCE(auth.uid()::text, '')
    AND public.has_boarded("propertyId")
  );

-- Same rule for edits: a former/current boarder may update only their own
-- rating (and only while they still qualify).
DROP POLICY IF EXISTS "property_reviews_update" ON public.property_reviews;
CREATE POLICY "property_reviews_update" ON public.property_reviews
  FOR UPDATE
  USING ("userId" = COALESCE(auth.uid()::text, ''))
  WITH CHECK (
    "userId" = COALESCE(auth.uid()::text, '')
    AND public.has_boarded("propertyId")
  );

DROP POLICY IF EXISTS "property_reviews_delete" ON public.property_reviews;
CREATE POLICY "property_reviews_delete" ON public.property_reviews
  FOR DELETE USING (
    "userId" = COALESCE(auth.uid()::text, '')
    OR public.is_admin()
  );

COMMIT;

-- ------------------------------------------------------------
-- Verify
-- ------------------------------------------------------------
SELECT
  pr."propertyId",
  COUNT(*) AS student_ratings,
  ROUND(AVG(pr.rating)::numeric, 2) AS average_rating
FROM public.property_reviews pr
GROUP BY pr."propertyId"
ORDER BY student_ratings DESC;
