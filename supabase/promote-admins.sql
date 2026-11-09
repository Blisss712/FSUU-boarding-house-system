-- ============================================================
-- PROMOTE ADMIN / AUDITOR ACCOUNTS for Balay Urios
-- ============================================================
-- "Auditor" is not a separate role in this project. The users table only
-- allows ('boarder', 'landlord', 'admin'), and the app just renders
-- role = 'admin' with the label "Auditor" in the header. So promoting an
-- account as an "admin auditor" means setting role = 'admin' in both
-- places:
--   * public.users.role                          → the app's login/profile check
--   * auth.users.raw_user_meta_data.isAdmin      → public.is_admin(), used by RLS
--
-- Both are required. public.users.role alone shows the Auditor tab but the
-- admin-only tables and the private landlord ID photos stay denied, because
-- public.is_admin() reads the JWT claim only.
--
-- HOW TO ADD ANOTHER ADMIN: add one line per person to BOTH email lists
-- below (step 2 and step 3), then run this whole file once in
-- Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- It is idempotent: safe to run more than once.
-- ============================================================

BEGIN;

-- 1. Allow the 'admin' role in public.users.
--    Must run before the updates: the on_auth_user_created trigger is
--    AFTER INSERT OR UPDATE, so step 3 re-fires it and would otherwise
--    hit error 23514 on the old constraint.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('boarder', 'landlord', 'admin'));

-- 2. Promote the admin accounts' profile rows.
--    Add one lower('email@example.com') line per additional auditor.
UPDATE public.users
   SET role = 'admin'
 WHERE lower(email) IN (
   lower('czar@gmail.com')
   -- , lower('second.auditor@gmail.com')
   -- , lower('third.auditor@gmail.com')
 );

-- 3. Mirror the role into Supabase Auth metadata.
--    This fires on_auth_user_created, which keeps public.users in sync, and
--    satisfies the app's second admin check (user_metadata.isAdmin) as well
--    as public.is_admin() for every RLS policy. Keep this list identical to
--    the one in step 2.
UPDATE auth.users
   SET raw_user_meta_data =
         coalesce(raw_user_meta_data, '{}'::jsonb)
         || jsonb_build_object('role', 'admin', 'isAdmin', true)
 WHERE lower(email) IN (
   lower('czar@gmail.com')
   -- , lower('second.auditor@gmail.com')
   -- , lower('third.auditor@gmail.com')
 );

COMMIT;

-- Verify: expect exactly one row per promoted address.
-- (An address missing here either was never signed up or is misspelled —
--  the UPDATE above silently matches zero rows in that case.)
SELECT u.id,
       u.email,
       u.role                                   AS profile_role,
       a.raw_user_meta_data->>'role'            AS meta_role,
       a.raw_user_meta_data->>'isAdmin'         AS meta_is_admin,
       a.email_confirmed_at IS NOT NULL         AS email_confirmed
  FROM public.users u
  JOIN auth.users a ON a.id::text = u.id
 WHERE u.role = 'admin'
 ORDER BY u.email;
