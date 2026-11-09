-- ============================================================
-- Balay Urios – Deleted accounts must leave the Auditor tab
-- ============================================================
-- SYMPTOM THIS FIXES
--   An account is deleted from Supabase Authentication (Dashboard ->
--   Authentication -> Users -> Delete, or auth.admin.deleteUser()), but the
--   Auditor tab keeps listing that landlord under "Landlord Accounts" and
--   "Pending audit", together with their valid-ID submission.
--
-- WHY IT HAPPENS
--   public.users is a *separate* profile table (`id text PRIMARY KEY`). It has
--   no foreign key to auth.users, and the only auth trigger installed by
--   supabase/full-setup.sql is `on_auth_user_created` (INSERT/UPDATE). Nothing
--   listens for DELETE on auth.users, so deleting an auth account leaves its
--   profile row, its public.landlord_ids row and its saved listings behind.
--   The Auditor tab reads public.users + public.landlord_ids, so those orphans
--   look like real accounts that never went away.
--
-- WHAT THIS FILE DOES
--   1. Installs `on_auth_user_deleted` — an AFTER DELETE trigger on auth.users
--      that removes the profile row, the valid-ID row and the saved listings.
--   2. Adds the `public.live_landlord_accounts()` RPC, which returns only
--      landlord profiles that still have a live auth account. api.getLandlords()
--      reads through it, so even a row orphaned before this migration can never
--      appear in the audit again.
--   3. One-time cleanup: deletes profile / valid-ID rows whose auth account is
--      already gone (this is what removes the ghost you are looking at now).
--
-- NOT TOUCHED ON PURPOSE
--   listings (properties), tenancy, receipts and curfew slips are business
--   records, not account data. A deleted landlord's pads stay online so you can
--   reassign or delete them deliberately; they simply stop showing an
--   Urios Verified host, because the host account no longer exists.
--   ID photos already stored in the private `landlord-ids` bucket are left in
--   Storage; delete the `<auth uid>/` folder there if you want them gone too.
--
-- Run this WHOLE file once in:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
-- Run it AFTER supabase/full-setup.sql and supabase/add-landlord-valid-id.sql
-- (the trigger is skipped safely if landlord_ids does not exist yet, but the
-- one-time cleanup can only clear ID rows when that table is there).
-- It is idempotent: safe to run again at any time.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. Admin helper (same definition as supabase/full-setup.sql).
--    Included so this file also works when run on its own.
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
-- 1. Keep public.* in sync when an auth account is deleted.
--    This is the mirror image of `handle_new_auth_user` (the sign-up
--    trigger from full-setup.sql): sign-up creates the profile, delete
--    removes it again.
--
--    Deleting the public.users row also cascades through the messaging
--    tables (add-messaging.sql declares ON DELETE CASCADE on
--    conversations."createdBy" and conversation_members."userId"), so a
--    removed account disappears from chats as well.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_deleted_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed_id text;
BEGIN
  -- Assigned in the body (not as a DECLARE default) so OLD is guaranteed to be
  -- populated at the time the value is read.
  removed_id := OLD.id::text;

  -- The valid-ID submission behind the "ID approval" row in the audit.
  IF to_regclass('public.landlord_ids') IS NOT NULL THEN
    DELETE FROM public.landlord_ids WHERE "userId" = removed_id;
  END IF;

  -- Per-user bookmarks (no FK, so nothing else would clean these up).
  IF to_regclass('public.saved_properties') IS NOT NULL THEN
    DELETE FROM public.saved_properties WHERE "userId" = removed_id;
  END IF;

  -- The profile row itself — the row the Auditor tab lists.
  DELETE FROM public.users WHERE id = removed_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_auth_user();

-- ------------------------------------------------------------
-- 2. Read path: only landlords that still exist in auth.
--
--    `a.id::text = u.id` compares in text on purpose: legacy/demo profile
--    rows may hold non-UUID ids ("user-student-jc"), and casting u.id to
--    uuid would abort the whole query on those rows.
--
--    SECURITY DEFINER is required because the `authenticated` role cannot
--    read auth.users. Access is gated on public.is_admin() — plus the
--    profile-row check the app itself uses (users.role = 'admin') so an admin
--    whose JWT metadata was never stamped still gets the filtered list.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.live_landlord_accounts()
RETURNS SETOF public.users
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_admin()
    OR EXISTS (
      SELECT 1
        FROM public.users me
       WHERE me.id = COALESCE(auth.uid()::text, '')
         AND me.role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION
      'Only an FSUU auditor (admin) can list landlord accounts.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT u.*
      FROM public.users u
     WHERE u.role = 'landlord'
       AND EXISTS (
         SELECT 1 FROM auth.users a WHERE a.id::text = u.id
       );
END;
$$;

REVOKE ALL ON FUNCTION public.live_landlord_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_landlord_accounts() TO authenticated;

-- ------------------------------------------------------------
-- 3. One-time cleanup of accounts deleted before this trigger existed.
--
--    Anything whose auth account is already gone is not an account: it can
--    never sign in again, and it only exists as a stale row. This is what
--    clears the ghost entries currently sitting in the audit.
--
--    Note: seeded demo rows that never had an auth account (ids such as
--    'user-student-jc') are removed by the same rule. Real profiles are
--    always created from a real auth user, so nothing legitimate matches.
-- ------------------------------------------------------------
DO $$
DECLARE
  orphan_id_rows      integer := 0;
  orphan_profile_rows integer := 0;
  ghost_landlords     integer := 0;
BEGIN
  -- Count first, so the notice names what was actually in the audit.
  SELECT count(*)
    INTO ghost_landlords
    FROM public.users u
   WHERE u.role = 'landlord'
     AND NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id::text = u.id);

  IF to_regclass('public.landlord_ids') IS NOT NULL THEN
    DELETE FROM public.landlord_ids li
     WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id::text = li."userId");
    GET DIAGNOSTICS orphan_id_rows = ROW_COUNT;
  END IF;

  DELETE FROM public.users u
   WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id::text = u.id);
  GET DIAGNOSTICS orphan_profile_rows = ROW_COUNT;

  RAISE NOTICE
    'Removed % deleted landlord account(s) from the audit, % orphan profile row(s) in total, % orphan valid-ID row(s).',
    ghost_landlords, orphan_profile_rows, orphan_id_rows;
END;
$$;

COMMIT;

-- Make the new RPC callable immediately instead of waiting for PostgREST to
-- notice the schema change on its own. Until it does, api.getLandlords() just
-- keeps using the plain table read (no error, no crash).
NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Verify 1: the delete trigger must exist (expect one row).
-- ------------------------------------------------------------
SELECT tgname AS trigger_name,
       tgrelid::regclass AS on_table,
       'AFTER DELETE'    AS fires
  FROM pg_trigger
 WHERE tgname = 'on_auth_user_deleted';

-- ------------------------------------------------------------
-- Verify 2: expect 0 rows — no profile exists without an auth account.
-- ------------------------------------------------------------
SELECT u.id, u.name, u.email, u.role
  FROM public.users u
 WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id::text = u.id)
 ORDER BY u.role, u.name;

-- ------------------------------------------------------------
-- Verify 3: expect 0 rows — no valid-ID row without a landlord profile.
-- (Wrapped so the file still runs on projects that have not run
--  supabase/add-landlord-valid-id.sql yet.)
-- ------------------------------------------------------------
DO $$
DECLARE
  orphan_total integer := 0;
BEGIN
  IF to_regclass('public.landlord_ids') IS NULL THEN
    RAISE NOTICE 'public.landlord_ids does not exist yet — run supabase/add-landlord-valid-id.sql for the ID review step.';
    RETURN;
  END IF;

  SELECT count(*)
    INTO orphan_total
    FROM public.landlord_ids li
   WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = li."userId");

  RAISE NOTICE 'Valid-ID rows without a landlord profile: % (expected 0).', orphan_total;
END;
$$;
