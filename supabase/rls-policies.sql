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

-- True when the caller actually boarded a property (active or ended tenancy).
-- Pending/rejected applications do not qualify.
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

-- True when a stored user id belongs to the signed-in account. Legacy rows
-- may hold the public.users id instead of auth.uid(), so match both.
CREATE OR REPLACE FUNCTION public.is_current_user(user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(user_id = auth.uid()::text, false)
      OR COALESCE(
           user_id = (
             SELECT u.id
               FROM public.users u
              WHERE lower(u.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
              LIMIT 1
           ),
           false
         );
$$;

-- ------------------------------------------------------------
-- Remove the old permissive policies (idempotent)
-- The messaging tables are skipped on purpose: their policies belong to
-- supabase/add-messaging.sql. Dropping them here left RLS enabled with no
-- policy, which silently disabled every chat in the app.
-- landlord_ids is skipped for the same reason: its private policies belong to
-- supabase/add-landlord-valid-id.sql, and dropping them here broke every valid
-- ID submission (42501 "new row violates row-level security policy").
-- ------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename NOT IN ('conversations', 'conversation_members', 'messages', 'chats', 'landlord_ids')
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
-- receipts — boarder, owning landlord, or admin
-- ------------------------------------------------------------
CREATE POLICY "receipts_select" ON receipts FOR SELECT
  USING (
    "userId" = auth.uid()::text
    OR public.is_current_user("userId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "receipts_insert" ON receipts FOR INSERT
  WITH CHECK (
    "userId" = auth.uid()::text
    OR public.is_current_user("userId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "receipts_update" ON receipts FOR UPDATE
  USING (
    "userId" = auth.uid()::text
    OR public.is_current_user("userId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  )
  WITH CHECK (
    "userId" = auth.uid()::text
    OR public.is_current_user("userId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "receipts_delete" ON receipts FOR DELETE
  USING (
    "userId" = auth.uid()::text
    OR public.is_current_user("userId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

-- ------------------------------------------------------------
-- payments — the rent ledger
-- Run supabase/add-payments.sql first: it creates the table and the
-- guard trigger that stops a student from verifying their own payment.
-- ------------------------------------------------------------
CREATE POLICY "payments_select" ON payments FOR SELECT
  USING (
    public.is_current_user("studentId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (
    public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "payments_update" ON payments FOR UPDATE
  USING (
    public.is_current_user("studentId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_current_user("studentId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "payments_delete" ON payments FOR DELETE
  USING (
    public.owns_property("propertyId")
    OR public.is_admin()
  );

-- ------------------------------------------------------------
-- property_reviews — public read; write only for students who boarded
-- ------------------------------------------------------------
CREATE POLICY "property_reviews_select" ON property_reviews FOR SELECT
  USING (true);

CREATE POLICY "property_reviews_insert" ON property_reviews FOR INSERT
  WITH CHECK (
    "userId" = auth.uid()::text
    AND public.has_boarded("propertyId")
  );

CREATE POLICY "property_reviews_update" ON property_reviews FOR UPDATE
  USING ("userId" = auth.uid()::text)
  WITH CHECK (
    "userId" = auth.uid()::text
    AND public.has_boarded("propertyId")
  );

CREATE POLICY "property_reviews_delete" ON property_reviews FOR DELETE
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

-- ------------------------------------------------------------
-- A student may submit a payment reference, never verify or reprice it.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_payment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role scripts, direct SQL and FK cascades run without an auth user;
  -- allow maintenance updates. Anon cannot reach this because payments RLS
  -- denies it.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Detaching a receipt is bookkeeping (receipt FK cascade / pad deletion);
  -- students still cannot attach or replace a receipt id.
  IF NEW."receiptId" IS NULL AND OLD."receiptId" IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF public.owns_property(OLD."propertyId") OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF public.is_current_user(OLD."studentId") THEN
    IF NEW."studentId" <> OLD."studentId"
       OR NEW."propertyId" <> OLD."propertyId"
       OR NEW."landlordId" IS DISTINCT FROM OLD."landlordId"
       OR NEW.amount <> OLD.amount
       OR NEW.title <> OLD.title
       OR NEW.category <> OLD.category
       OR NEW."dueDate" IS DISTINCT FROM OLD."dueDate"
       OR NEW."receiptId" IS DISTINCT FROM OLD."receiptId"
       OR NEW."verifiedAt" IS DISTINCT FROM OLD."verifiedAt"
       OR NEW."verifiedBy" IS DISTINCT FROM OLD."verifiedBy"
    THEN
      RAISE EXCEPTION 'Students may only submit a payment method, reference number and note.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status NOT IN ('pending', 'awaiting_verification') THEN
      RAISE EXCEPTION 'Students cannot mark a payment as paid or cancelled.'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'You are not allowed to update this payment.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS payments_guard_update ON payments;
CREATE TRIGGER payments_guard_update
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_payment_update();

COMMIT;
