-- ============================================================
-- RLS HARDENING — Balay Urios (verified against the live project)
-- ============================================================
-- WHY THIS EXISTS
-- A read-only probe of the production project
-- (https://pjkjfkrdjxwxfkmhthng.supabase.co) with the *public* anon key
-- returned 33 rows from public.users — every account in the system,
-- including the admin — with `email`, `name`, `role` and the rest of the
-- row selectable by anyone on the internet. The anon key ships inside the
-- browser bundle, so those rows were effectively published.
--
-- Two more open reads were found:
--   * ocular_visits  — student name, student id, phone, notes  (1 row live)
--   * sms_logs       — phone + message text                    (0 rows live)
--
-- FIX STRATEGY
--   Stage A  lock the two tables nothing in the client ever reads.
--   Stage B  take SELECT on `users` away from anonymous visitors, but keep
--            the property feed working for signed-out browsers through a
--            narrow read-only view (landlord_directory). The app prefers that
--            view and falls back to the table if it is missing, so deploying
--            the code and running this file can happen in either order.
--
-- WHAT IS DELIBERATELY LEFT ALONE
--   * properties        — public browsing is the product.
--   * property_reviews  — public reviews are the product.
--   * campuses,
--     appliances        — reference data.
--   * messages,
--     conversations     — already locked (42501 for anon; correct).
--
-- RESIDUAL RISK (documented, not fixed here)
--   Stage B still lets *any signed-in account* read every profile row,
--   because the app reads users by id/role/email for the landlord
--   directory, messaging contacts, chat participants and tenancy
--   enrichment. Because phone / studentId / passwordHash are currently
--   empty, the exposure today is emails + names. Stage C at the bottom
--   sketches the per-row scoping needed to close that too.
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Idempotent: safe to re-run.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Helpers (redefined here so this file does not depend on
-- supabase/rls-policies.sql having been run first)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() -> 'user_metadata' ->> 'isAdmin')::boolean, false)
      OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.owns_property(prop_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.properties p
     WHERE p.id = prop_id
       AND COALESCE(p.landlord->>'userId', '') = COALESCE(auth.uid()::text, '')
  );
$$;

-- ------------------------------------------------------------
-- STAGE A — tables with no client reads at all
-- ------------------------------------------------------------

-- sms_logs: phone numbers + message bodies. Admin-only from now on.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'sms_logs' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sms_logs', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "sms_select_admin" ON public.sms_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ocular_visits: student name / student id / phone / notes.
-- Readable by the landlord who owns the property, or an admin.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'ocular_visits' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ocular_visits', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "visits_select_landlord_admin" ON public.ocular_visits
  FOR SELECT TO authenticated
  USING (public.owns_property("propertyId") OR public.is_admin());

-- ------------------------------------------------------------
-- STAGE B — users: public read becomes a narrow directory view
-- ------------------------------------------------------------

-- Only non-sensitive columns, only landlords. The property feed uses this to
-- paint the "Urios Verified" badge for signed-out visitors.
--
-- The view is owned by the migration role (postgres), so it runs with the
-- owner's privileges and keeps working after SELECT is revoked from anon.
-- Do NOT add `ALTER TABLE public.users FORCE ROW LEVEL SECURITY` or this
-- view stops returning rows.
CREATE OR REPLACE VIEW public.landlord_directory AS
SELECT
  id,
  name,
  email,
  role,
  "avatarInitials",
  "isUriosVerified",
  "verificationStatus",
  "verifiedAt",
  "verifiedBy",
  "verificationNotes",
  facebook,
  instagram,
  twitter,
  "createdAt"
FROM public.users
WHERE role = 'landlord';

REVOKE ALL ON public.landlord_directory FROM anon, authenticated;
GRANT SELECT ON public.landlord_directory TO anon, authenticated;

-- Drop every existing SELECT policy on users (names vary between setups),
-- then admit signed-in users only. Anonymous visitors get nothing — they use
-- the view above.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT TO authenticated
  USING (true);

COMMIT;

-- ============================================================
-- VERIFY (run after COMMIT; every row should say the expected value)
-- ============================================================
-- 1) RLS status + policy count per table
-- SELECT c.relname AS table_name,
--        c.relrowsecurity AS rls_enabled,
--        count(p.policyname) AS policies
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
--  WHERE n.nspname = 'public' AND c.relkind = 'r'
--  GROUP BY 1, 2 ORDER BY 3 ASC, 1;
--
-- 2) Every policy that is still open to everyone
-- SELECT tablename, policyname, cmd, roles, qual
--   FROM pg_policies
--  WHERE schemaname = 'public' AND (qual = 'true' OR qual IS NULL)
--  ORDER BY tablename, cmd;
--
-- 3) Anonymous read smoke test, from a terminal (should return [] for users,
--    and rows for landlord_directory):
--   curl -s "$SUPABASE_URL/rest/v1/users?select=email&limit=1" \
--        -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
--   curl -s "$SUPABASE_URL/rest/v1/landlord_directory?select=name&limit=3" \
--        -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

-- ============================================================
-- STAGE C — optional follow-up: per-row scoping for profiles
-- ============================================================
-- Only worth running after the messaging contact list and tenancy
-- enrichment are reworked to use narrow views. Sketch:
--
-- CREATE POLICY "users_select_self" ON public.users
--   FOR SELECT TO authenticated USING (id = auth.uid()::text);
--
-- CREATE POLICY "users_select_landlord_tenants" ON public.users
--   FOR SELECT TO authenticated
--   USING (EXISTS (
--     SELECT 1 FROM public.tenancy t
--      WHERE t."userId" = public.users.id
--        AND public.owns_property(t."propertyId")
--   ));
--
-- CREATE POLICY "users_select_admin" ON public.users
--   FOR SELECT TO authenticated USING (public.is_admin());
--
-- ...plus views for messaging (chat participants) and contacts.
