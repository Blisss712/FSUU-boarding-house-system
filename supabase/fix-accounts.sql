-- ============================================================
-- FIX ACCOUNTS & LISTINGS (standalone — safe to copy-paste & re-run)
-- ============================================================
-- Run this once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- It is idempotent (safe to run more than once).
--
-- This file fixes three things:
--   1. The missing `properties.buildingCondition` column that crashes the
--      admin audit ("column properties.buildingCondition does not exist").
--   2. Listings that are owned only by email (no `landlord.userId`), which
--      makes ownership fragile and lets listings look "mixed up".
--   3. Landlord profiles whose `propertyId` was never set.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Add the missing building-audit column (the audit crash)
-- ------------------------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS "buildingCondition" JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ------------------------------------------------------------
-- 2. Stamp every listing with the owning landlord's user id.
--    Ownership is matched by the landlord email already stored on the
--    listing. This is the durable link the app checks first.
-- ------------------------------------------------------------
UPDATE public.properties p
   SET landlord = p.landlord || jsonb_build_object('userId', u.id)
  FROM public.users u
 WHERE lower(u.email) = lower(p.landlord->>'email')
   AND u.role = 'landlord'
   AND COALESCE(p.landlord->>'userId', '') IS DISTINCT FROM u.id;

-- ------------------------------------------------------------
-- 3. Point each landlord profile at their listing (single-listing
--    landlords only — a profile can only hold one propertyId).
-- ------------------------------------------------------------
WITH one_listing AS (
  SELECT lower(p.landlord->>'email') AS email, max(p.id) AS property_id
    FROM public.properties p
   WHERE p.landlord->>'email' IS NOT NULL
   GROUP BY lower(p.landlord->>'email')
  HAVING count(*) = 1
)
UPDATE public.users u
   SET "propertyId" = ol.property_id
  FROM one_listing ol
 WHERE lower(u.email) = ol.email
   AND u.role = 'landlord'
   AND COALESCE(u."propertyId", '') IS DISTINCT FROM ol.property_id;

COMMIT;

-- ------------------------------------------------------------
-- Verify (expect: 11 rows, each with userId + propertyId set)
-- ------------------------------------------------------------
SELECT p.id,
       p.name,
       p.landlord->>'email'                 AS landlord_email,
       p.landlord->>'userId'                AS landlord_userId,
       u."propertyId"                       AS profile_propertyId,
       (p.landlord->>'userId' IS NOT NULL)  AS linked_ok
  FROM public.properties p
  LEFT JOIN public.users u
         ON lower(u.email) = lower(p.landlord->>'email')
        AND u.role = 'landlord'
 ORDER BY p.name;
