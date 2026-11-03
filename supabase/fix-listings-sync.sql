-- ============================================================
-- FIX LISTINGS <-> LANDLORD SYNC (standalone, idempotent, safe to re-run)
-- ============================================================
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- The app now treats `properties.landlord->>'userId'` as the durable
-- ownership key (matching the RLS policies) and falls back to a
-- case-insensitive `landlord->>'email'` match. This script brings the
-- existing database in line with that contract so every landlord's
-- "My Listings" view shows exactly their own pads — never missing or
-- "mixed up" with another landlord's.
--
-- It fixes:
--   1. Listings whose `landlord.userId` is NULL / missing (email-only link).
--   2. Listings whose `landlord.userId` points at a stale or wrong id.
--   3. Listings missing a normalized `landlord.email`.
--   4. Landlord profiles whose single-listing `propertyId` pointer was unset.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Stamp every listing with the owning landlord's auth id,
--    matched case-insensitively on the landlord email already on the
--    listing. This is the durable link the app + RLS check first.
-- ------------------------------------------------------------
UPDATE public.properties p
   SET landlord = p.landlord || jsonb_build_object('userId', u.id)
  FROM public.users u
 WHERE u.role = 'landlord'
   AND lower(u.email) = lower(p.landlord->>'email')
   AND COALESCE(p.landlord->>'userId', '') IS DISTINCT FROM u.id;

-- ------------------------------------------------------------
-- 2. Repair listings whose userId points at a *different* user than
--    their email claims. Email wins only when it maps to a real landlord
--    account, so a stale userId can never steal another landlord's pad.
-- ------------------------------------------------------------
UPDATE public.properties p
   SET landlord = p.landlord || jsonb_build_object('userId', u.id)
  FROM public.users u
 WHERE u.role = 'landlord'
   AND lower(u.email) = lower(p.landlord->>'email')
   AND p.landlord->>'userId' IS NOT NULL
   AND lower(p.landlord->>'userId') IS DISTINCT FROM lower(u.id);

-- ------------------------------------------------------------
-- 3. Backfill a normalized `landlord.email` where only a userId exists
--    (reverse direction). Keeps the email fallback working everywhere.
-- ------------------------------------------------------------
UPDATE public.properties p
   SET landlord = p.landlord || jsonb_build_object('email', u.email)
  FROM public.users u
 WHERE u.role = 'landlord'
   AND lower(u.id) = lower(p.landlord->>'userId')
   AND COALESCE(p.landlord->>'email', '') = '';

-- ------------------------------------------------------------
-- 4. Point each single-listing landlord profile at their listing.
--    (A users row can hold only one propertyId, so multi-listing
--    landlords rely on landlord.userId — which step 1 already fixed.)
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
 WHERE u.role = 'landlord'
   AND lower(u.email) = ol.email
   AND COALESCE(u."propertyId", '') IS DISTINCT FROM ol.property_id;

COMMIT;

-- ------------------------------------------------------------
-- Verify — every listing should report linked_ok = true.
-- ------------------------------------------------------------
SELECT p.id,
       p.name,
       p.landlord->>'email'  AS landlord_email,
       p.landlord->>'userId' AS landlord_userId,
       u.id                 AS profile_userId,
       u."propertyId"       AS profile_propertyId,
       (p.landlord->>'userId' IS NOT NULL
        AND lower(p.landlord->>'userId') = lower(u.id)) AS linked_ok
  FROM public.properties p
  LEFT JOIN public.users u
         ON lower(u.email) = lower(p.landlord->>'email')
        AND u.role = 'landlord'
 ORDER BY p.name;
