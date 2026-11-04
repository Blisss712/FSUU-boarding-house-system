-- ============================================================
-- Balay Urios – Landlord account verification
-- ============================================================
-- Adds the account-level "Urios Verified" approval used by the
-- Auditor tab. Admins approve a landlord account once, and every
-- pad that account owns can then display the verified host badge.
--
-- Run this whole file once in:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
-- It is idempotent: safe to run more than once.
-- ============================================================

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS "isUriosVerified" boolean NOT NULL DEFAULT false;

-- Some earlier databases stored this flag as an integer (0/1). Normalize it to
-- a real boolean so PostgREST and the app agree on the value type.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'
       AND column_name = 'isUriosVerified'
       AND data_type IN ('integer', 'smallint', 'bigint')
  ) THEN
    ALTER TABLE public.users ALTER COLUMN "isUriosVerified" DROP DEFAULT;
    ALTER TABLE public.users
      ALTER COLUMN "isUriosVerified" TYPE boolean
      USING ("isUriosVerified" <> 0);
    ALTER TABLE public.users ALTER COLUMN "isUriosVerified" SET DEFAULT false;
  END IF;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS "verificationStatus" text NOT NULL DEFAULT 'pending';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS "verifiedAt" timestamptz;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS "verifiedBy" text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS "verificationNotes" text;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_verification_status_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_verification_status_check
  CHECK ("verificationStatus" IN ('pending', 'verified', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_users_landlord_verification
  ON public.users (role, "isUriosVerified");

COMMIT;

-- Verify: lists the landlord accounts and their current approval state.
SELECT id, name, email, role, "isUriosVerified", "verificationStatus",
       "verifiedAt", "verifiedBy", "verificationNotes"
  FROM public.users
 WHERE role = 'landlord'
 ORDER BY "createdAt" DESC;
