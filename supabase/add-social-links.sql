-- ============================================================
-- Balay Urios – Public social links on user & landlord profiles
-- ============================================================
-- Adds optional Facebook / Instagram / X (Twitter) handles to every
-- account. Landlords' links are shown on their public landlord
-- profile; boarders' links are shown to the landlord on the tenant
-- profile. Only these public handles are exposed — no private data.
--
-- Run once in:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
-- It is idempotent: safe to run more than once.
-- ============================================================

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS facebook text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS instagram text;

-- Stored under `twitter` for clarity. The UI accepts both x.com and
-- twitter.com links and normalizes them for display.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS twitter text;

COMMIT;

-- Verify
SELECT id, name, role, facebook, instagram, twitter
  FROM public.users
 ORDER BY role, name
 LIMIT 20;
