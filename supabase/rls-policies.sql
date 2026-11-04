-- ============================================================
-- HARDENED ROW LEVEL SECURITY (RLS) — replace the old "public"
-- policies (standalone — safe to copy-paste & re-run)
-- ============================================================
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Idempotent: it drops existing public.* policies and recreates them.
--
-- WHY THIS EXISTS
-- The original setup enabled RLS but created every policy with
-- USING (true) / WITH CHECK (true). That is a serious anti-pattern:
-- it means ANY client holding the public anon key — including a guest
-- or another user — could UPDATE or DELETE anyone's listing, profile,
-- tenancy, curfew slip, etc. That is exactly how listing data gets
-- "compromised" (one account's listing overwritten/removed by another).
--
-- WHAT CHANGES
--   * Listings (properties): only the owning landlord (or an admin)
--     may insert / update / delete. Browsing stays public.
--   * Profiles (users): only the owner (or an admin) may update;
--     insert is self-only; delete is admin-only. Read stays public so
--     tenant views keep working.
--   * User-owned records (saved_properties, tenancy, curfew_slips,
--     receipts): scoped to the owning user, the owning landlord, or an
--     admin.
--   * sms_logs / ocular_visits have no user-id column to scope
--     cleanly, so writes are now limited to signed-in users while reads
--     stay public (see the note at the bottom).
--
-- REQUIREMENTS BEFORE RUNNING
--   * Listings must have landlord.userId set. If they don't, run
--     supabase/fix-accounts.sql first (it backfills it from email).
--   * Admins must have user_metadata.isAdmin = true and/or
--     user_metadata.role = 'admin' (see scripts/create-admin.js).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
-- True when the caller is an admin, read straight from their JWT
-- (no table lookup -> no RLS recursion).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() -> 'user_metadata' ->> 'isAdmin')::boolean, false)
      OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin';
$$;

-- True when the caller is the landlord who owns a given listing.
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
-- Remove the old permissive policies (idempotent)
-- ------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
      FROM pg_policies
     WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- Reference data (read-only for everyone)
-- ------------------------------------------------------------
CREATE POLICY "campuses_select"   ON campuses   FOR SELECT USING (true);
CREATE POLICY "appliances_select" ON appliances FOR SELECT USING (true);

-- ------------------------------------------------------------
-- properties — public browse, owner-only writes
-- ------------------------------------------------------------
CREATE POLICY "properties_select" ON properties FOR SELECT USING (true);

CREATE POLICY "properties_insert" ON properties FOR INSERT
  WITH CHECK (
    COALESCE(landlord->>'userId', '') = COALESCE(auth.uid()::text, '')
    OR public.is_admin()
  );

CREATE POLICY "properties_update" ON properties FOR UPDATE
  USING (
    COALESCE(landlord->>'userId', '') = COALESCE(auth.uid()::text, '')
    OR public.is_admin()
  )
  WITH CHECK (
    COALESCE(landlord->>'userId', '') = COALESCE(auth.uid()::text, '')
    OR public.is_admin()
  );

CREATE POLICY "properties_delete" ON properties FOR DELETE
  USING (
    COALESCE(landlord->>'userId', '') = COALESCE(auth.uid()::text, '')
    OR public.is_admin()
  );

-- ------------------------------------------------------------
-- users — public read (tenant views need it), owner-only writes
-- ------------------------------------------------------------
CREATE POLICY "users_select" ON users FOR SELECT USING (true);

CREATE POLICY "users_insert" ON users FOR INSERT
  WITH CHECK (id = auth.uid()::text OR public.is_admin());

CREATE POLICY "users_update" ON users FOR UPDATE
  USING (id = auth.uid()::text OR public.is_admin())
  WITH CHECK (id = auth.uid()::text OR public.is_admin());

CREATE POLICY "users_delete" ON users FOR DELETE
  USING (public.is_admin());

-- ------------------------------------------------------------
-- saved_properties — owner only
-- ------------------------------------------------------------
CREATE POLICY "saved_select" ON saved_properties FOR SELECT
  USING ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "saved_insert" ON saved_properties FOR INSERT
  WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "saved_delete" ON saved_properties FOR DELETE
  USING ("userId" = auth.uid()::text OR public.is_admin());

-- ------------------------------------------------------------
-- tenancy — boarder (owner) or the owning landlord or admin
-- ------------------------------------------------------------
CREATE POLICY "tenancy_select" ON tenancy FOR SELECT
  USING (
    "userId" = auth.uid()::text
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "tenancy_insert" ON tenancy FOR INSERT
  WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "tenancy_update" ON tenancy FOR UPDATE
  USING (
    "userId" = auth.uid()::text
    OR public.owns_property("propertyId")
    OR public.is_admin()
  )
  WITH CHECK (
    "userId" = auth.uid()::text
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "tenancy_delete" ON tenancy FOR DELETE
  USING ("userId" = auth.uid()::text OR public.is_admin());

-- ------------------------------------------------------------
-- curfew_slips — boarder or owning landlord or admin
-- ------------------------------------------------------------
CREATE POLICY "curfew_select" ON curfew_slips FOR SELECT
  USING (
    "userId" = auth.uid()::text
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "curfew_insert" ON curfew_slips FOR INSERT
  WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "curfew_update" ON curfew_slips FOR UPDATE
  USING (
    "userId" = auth.uid()::text
    OR public.owns_property("propertyId")
    OR public.is_admin()
  )
  WITH CHECK (
    "userId" = auth.uid()::text
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "curfew_delete" ON curfew_slips FOR DELETE
  USING ("userId" = auth.uid()::text OR public.is_admin());

-- ------------------------------------------------------------
-- receipts — owner only (boarder reads/writes their own)
-- ------------------------------------------------------------
CREATE POLICY "receipts_select" ON receipts FOR SELECT
  USING ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "receipts_insert" ON receipts FOR INSERT
  WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "receipts_update" ON receipts FOR UPDATE
  USING ("userId" = auth.uid()::text OR public.is_admin());

CREATE POLICY "receipts_delete" ON receipts FOR DELETE
  USING ("userId" = auth.uid()::text OR public.is_admin());

-- ------------------------------------------------------------
-- sms_logs / ocular_visits
-- These tables have no user-id column to scope ownership by, so we keep
-- public read but require a signed-in user for writes. This is still
-- permissive; if you later add a sender/owner id column, scope these the
-- same way as tenancy/curfew above.
-- ------------------------------------------------------------
CREATE POLICY "sms_select" ON sms_logs FOR SELECT USING (true);
CREATE POLICY "sms_insert" ON sms_logs FOR INSERT
  WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'authenticated');

CREATE POLICY "visits_select" ON ocular_visits FOR SELECT USING (true);
CREATE POLICY "visits_insert" ON ocular_visits FOR INSERT
  WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'authenticated');
CREATE POLICY "visits_update" ON ocular_visits FOR UPDATE
  USING (
    public.owns_property("propertyId")
    OR public.is_admin()
  );

COMMIT;
