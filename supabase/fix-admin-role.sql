-- ============================================================
-- FIX: Admin login for Balay Urios
-- ============================================================
-- Symptom this repairs:
--   * public.users rejects role = 'admin' with
--     "new row for relation "users" violates check constraint
--      users_role_check" (Postgres code 23514)
--   * Supabase Auth returns 500 "Error updating user" whenever the
--     profile trigger tries to write an admin role
--   * therefore no account can ever resolve as admin in the app,
--     and the "Auditor" tab never appears.
--
-- Cause: this project's users table was created from an older schema
-- whose role CHECK constraint only allowed ('boarder', 'landlord').
-- full-setup.sql allows ('boarder', 'landlord', 'admin'), but
-- CREATE TABLE IF NOT EXISTS does not alter an existing table.
--
-- Run this whole file once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- It is idempotent: safe to run more than once.
-- ============================================================

BEGIN;

-- 1. Allow the 'admin' role in public.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('boarder', 'landlord', 'admin'));

-- 2. Promote the admin account's profile row
UPDATE public.users
   SET role = 'admin'
 WHERE lower(email) = lower('czar@gmail.com');

-- 3. Mirror the role into Supabase Auth metadata.
--    This fires on_auth_user_created, which keeps public.users in sync,
--    and satisfies the app's second admin check (user_metadata.isAdmin).
UPDATE auth.users
   SET raw_user_meta_data =
         coalesce(raw_user_meta_data, '{}'::jsonb)
         || jsonb_build_object('role', 'admin', 'isAdmin', true)
 WHERE lower(email) = lower('czar@gmail.com');

COMMIT;

-- Verify (expect exactly one row, role = admin, meta_role = admin):
SELECT u.id,
       u.email,
       u.role                                   AS profile_role,
       a.raw_user_meta_data->>'role'            AS meta_role,
       a.raw_user_meta_data->>'isAdmin'         AS meta_is_admin,
       a.email_confirmed_at IS NOT NULL         AS email_confirmed
  FROM public.users u
  JOIN auth.users a ON a.id::text = u.id
 WHERE lower(u.email) = lower('czar@gmail.com');
