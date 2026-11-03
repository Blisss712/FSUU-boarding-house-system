-- ============================================================
-- TENANT APPLICATION APPROVAL WORKFLOW
-- ============================================================
-- Adds a `status` column to the tenancy table so that a student's
-- "Board / Apply" action creates a PENDING request that the landlord
-- must approve before the student becomes an active tenant.
--
--   pending   -> student applied, awaiting landlord decision   (isActive = 0)
--   active    -> landlord approved, student is a tenant         (isActive = 1)
--   rejected  -> landlord declined the application              (isActive = 0)
--   ended     -> tenancy concluded / student moved out          (isActive = 0)
--
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Idempotent: safe to re-run.
-- ============================================================

BEGIN;

ALTER TABLE public.tenancy
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Backfill existing rows from the legacy isActive flag.
UPDATE public.tenancy SET status = 'active' WHERE "isActive" = 1;
UPDATE public.tenancy SET status = 'ended'  WHERE "isActive" = 0;

CREATE INDEX IF NOT EXISTS idx_tenancy_status ON public.tenancy(status);

-- Let the owning landlord issue the move-in receipt when they approve a
-- tenant (the original receipts_insert only permitted the tenant themselves).
DROP POLICY IF EXISTS "receipts_landlord_insert" ON public.receipts;
CREATE POLICY "receipts_landlord_insert" ON public.receipts
  FOR INSERT WITH CHECK (public.owns_property("propertyId") OR public.is_admin());

COMMIT;

-- ------------------------------------------------------------
-- Verify
-- ------------------------------------------------------------
SELECT status, count(*) AS tenants
  FROM public.tenancy
 GROUP BY status
 ORDER BY status;
