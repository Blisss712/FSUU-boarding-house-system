-- ============================================================
-- Balay Urios – Verification workflow (ID first, account second)
-- ============================================================
-- The Urios Verified badge is only valid when the landlord's
-- government ID has been reviewed and approved. The app enforces
-- that order in api.verifyLandlordAccount(); this trigger enforces
-- the same rule in the database so no client, script, or manual
-- SQL edit can hand out the badge ahead of the ID review.
--
-- Order of the process:
--   Step 1  public.landlord_ids.status  ->  'approved'
--   Step 2  public.users."isUriosVerified" -> true
--
-- Revoking (isUriosVerified = false) is never blocked, so an
-- auditor can always take the badge away.
--
-- Run this WHOLE file once in Supabase →
--   SQL Editor → New query → Run
--
-- Run it AFTER supabase/add-landlord-valid-id.sql (it reads that
-- table) and after supabase/add-landlord-verification.sql (it
-- reads those columns). It is idempotent: safe to run again.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_valid_id_before_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_now_verified boolean;
  was_verified   boolean;
  id_status      text;
BEGIN
  -- Type-safe truthiness: legacy projects stored 0/1, new ones store
  -- booleans, so compare the text form instead of casting the column.
  is_now_verified := lower(COALESCE(NEW."isUriosVerified"::text, 'false')) IN ('true', 't', '1');
  was_verified   := lower(COALESCE(OLD."isUriosVerified"::text, 'false')) IN ('true', 't', '1');

  -- Only a transition into "verified" needs the ID gate.
  IF NOT is_now_verified OR was_verified THEN
    RETURN NEW;
  END IF;

  IF to_regclass('public.landlord_ids') IS NULL THEN
    RAISE EXCEPTION
      'Cannot mark a landlord Urios Verified: public.landlord_ids is missing. Run supabase/add-landlord-valid-id.sql first.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT li."status"
    INTO id_status
    FROM public.landlord_ids li
   WHERE li."userId" = NEW."id"::text;

  IF COALESCE(id_status, 'missing') <> 'approved' THEN
    RAISE EXCEPTION
      'Valid ID must be approved before this landlord account can be marked Urios Verified (current ID status: %).',
      COALESCE(id_status, 'missing')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_valid_id_before_verification ON public.users;
CREATE TRIGGER enforce_valid_id_before_verification
  BEFORE UPDATE OF "isUriosVerified" ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_valid_id_before_verification();

-- ------------------------------------------------------------
-- The reverse direction: a badge can never outlive its ID. If an
-- approved ID leaves the approved state (rejected, or a fresh
-- submission resets it to pending), the account badge is revoked.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_verification_when_id_leaves_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  id_column_type text;
BEGIN
  IF COALESCE(OLD."status", '') <> 'approved'
     OR COALESCE(NEW."status", '') = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Older projects store 0/1, so write the value in the column's own type.
  SELECT data_type
    INTO id_column_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'users'
     AND column_name = 'isUriosVerified';

  IF id_column_type = 'boolean' THEN
    EXECUTE
      'UPDATE public.users
          SET "isUriosVerified" = false,
              "verificationStatus" = ''pending'',
              "verifiedAt" = NULL,
              "verifiedBy" = NULL,
              "verificationNotes" = ''Verification paused — the valid ID is no longer approved.''
        WHERE id::text = $1
          AND "isUriosVerified" IS TRUE'
      USING NEW."userId";
  ELSE
    EXECUTE
      'UPDATE public.users
          SET "isUriosVerified" = 0,
              "verificationStatus" = ''pending'',
              "verifiedAt" = NULL,
              "verifiedBy" = NULL,
              "verificationNotes" = ''Verification paused — the valid ID is no longer approved.''
        WHERE id::text = $1
          AND lower(COALESCE("isUriosVerified"::text, ''0'')) IN (''1'', ''true'', ''t'')'
      USING NEW."userId";
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS revoke_verification_when_id_leaves_approved ON public.landlord_ids;
CREATE TRIGGER revoke_verification_when_id_leaves_approved
  AFTER UPDATE OF "status" ON public.landlord_ids
  FOR EACH ROW
  EXECUTE FUNCTION public.revoke_verification_when_id_leaves_approved();

-- ------------------------------------------------------------
-- One-time cleanup of existing data: revoke every badge whose
-- landlord has no approved valid ID on file. Accounts verified
-- before this workflow existed would otherwise keep advertising
-- "Urios Verified" next to "No ID submitted".
-- ------------------------------------------------------------
DO $$
DECLARE
  id_column_type text;
BEGIN
  SELECT data_type
    INTO id_column_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'users'
     AND column_name = 'isUriosVerified';

  IF id_column_type = 'boolean' THEN
    UPDATE public.users u
       SET "isUriosVerified" = false,
           "verificationStatus" = 'pending',
           "verifiedAt" = NULL,
           "verifiedBy" = NULL,
           "verificationNotes" = 'Verification cleared — no approved valid ID on file.'
     WHERE u."isUriosVerified" IS TRUE
       AND NOT EXISTS (
         SELECT 1
           FROM public.landlord_ids li
          WHERE li."userId" = u.id::text
            AND li."status" = 'approved'
       );
  ELSE
    UPDATE public.users u
       SET "isUriosVerified" = 0,
           "verificationStatus" = 'pending',
           "verifiedAt" = NULL,
           "verifiedBy" = NULL,
           "verificationNotes" = 'Verification cleared — no approved valid ID on file.'
     WHERE lower(COALESCE(u."isUriosVerified"::text, '0')) IN ('1', 'true', 't')
       AND NOT EXISTS (
         SELECT 1
           FROM public.landlord_ids li
          WHERE li."userId" = u.id::text
            AND li."status" = 'approved'
       );
  END IF;
END;
$$;

COMMIT;

-- Expect 0 rows: no landlord can be verified without an approved ID.
SELECT u.id, u.name, u."verificationStatus"
  FROM public.users u
 WHERE lower(COALESCE(u."isUriosVerified"::text, 'false')) IN ('1', 'true', 't')
   AND NOT EXISTS (
     SELECT 1 FROM public.landlord_ids li
      WHERE li."userId" = u.id::text AND li."status" = 'approved'
   );

-- ------------------------------------------------------------
-- Verify: both triggers should exist, and this should return two rows.
-- ------------------------------------------------------------
SELECT tgname AS trigger_name,
       tgrelid::regclass AS on_table
  FROM pg_trigger
 WHERE tgname IN (
   'enforce_valid_id_before_verification',
   'revoke_verification_when_id_leaves_approved'
 )
 ORDER BY tgname;
