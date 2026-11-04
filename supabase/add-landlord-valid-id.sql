-- ============================================================
-- Balay Urios – Landlord Valid ID submissions (PRIVATE)
-- ============================================================
-- Lets a landlord submit a valid government ID (type, number and
-- optional photo) which ONLY admins/auditors (and the landlord who
-- owns the row) can read. Students and the public can never see it.
--
-- Run this WHOLE file once in:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Run it AFTER supabase/rls-policies.sql (that file drops every
-- public.* policy when re-run, so re-run this file after it).
-- It is idempotent: safe to run more than once.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. Admin helper (same definition as supabase/rls-policies.sql).
--    Included here so this file also works if run on its own.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() -> 'user_metadata' ->> 'isAdmin')::boolean, false)
      OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin';
$$;

-- ------------------------------------------------------------
-- 1. Private ID table (one row per landlord account)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.landlord_ids (
  "userId"         text PRIMARY KEY,
  "fullName"       text,
  "idType"         text NOT NULL DEFAULT 'Philippine National ID (PhilSys)',
  "idNumber"       text NOT NULL,
  "frontImagePath" text,
  "backImagePath"  text,
  "status"         text NOT NULL DEFAULT 'pending',
  "submittedAt"    timestamptz NOT NULL DEFAULT now(),
  "reviewedAt"     timestamptz,
  "reviewedBy"     text,
  "reviewNotes"    text,
  "createdAt"      timestamptz NOT NULL DEFAULT now(),
  "updatedAt"      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landlord_ids
  DROP CONSTRAINT IF EXISTS landlord_ids_status_check;

ALTER TABLE public.landlord_ids
  ADD CONSTRAINT landlord_ids_status_check
  CHECK ("status" IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_landlord_ids_status
  ON public.landlord_ids ("status");

-- ------------------------------------------------------------
-- 2. Row Level Security
--    Own row = read/write. Admin = read all + review.
--    There is NO policy for anon/students, so they see nothing.
-- ------------------------------------------------------------
ALTER TABLE public.landlord_ids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "landlord_ids_select" ON public.landlord_ids;
CREATE POLICY "landlord_ids_select" ON public.landlord_ids
  FOR SELECT
  USING ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "landlord_ids_insert" ON public.landlord_ids;
CREATE POLICY "landlord_ids_insert" ON public.landlord_ids
  FOR INSERT
  WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "landlord_ids_update" ON public.landlord_ids;
CREATE POLICY "landlord_ids_update" ON public.landlord_ids
  FOR UPDATE
  USING ("userId" = auth.uid()::text OR public.is_admin())
  WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "landlord_ids_delete" ON public.landlord_ids;
CREATE POLICY "landlord_ids_delete" ON public.landlord_ids
  FOR DELETE
  USING (public.is_admin());

-- ------------------------------------------------------------
-- 3. Private storage bucket for the ID photos
--    Files live under a per-landlord folder: <auth uid>/front-*.jpg
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('landlord-ids', 'landlord-ids', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "landlord_ids_upload_own" ON storage.objects;
CREATE POLICY "landlord_ids_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'landlord-ids'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "landlord_ids_update_own" ON storage.objects;
CREATE POLICY "landlord_ids_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'landlord-ids'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  )
  WITH CHECK (
    bucket_id = 'landlord-ids'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

-- Only the owning landlord or an admin/auditor can read an ID photo.
DROP POLICY IF EXISTS "landlord_ids_read_own_or_admin" ON storage.objects;
CREATE POLICY "landlord_ids_read_own_or_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'landlord-ids'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "landlord_ids_delete_own_or_admin" ON storage.objects;
CREATE POLICY "landlord_ids_delete_own_or_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'landlord-ids'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

COMMIT;

-- ------------------------------------------------------------
-- Verify (expect: an empty table on the first run)
-- ------------------------------------------------------------
SELECT "userId", "fullName", "idType",
       '••••' || right("idNumber", 4) AS masked_id,
       "status", "submittedAt"
  FROM public.landlord_ids
 ORDER BY "submittedAt" DESC;
