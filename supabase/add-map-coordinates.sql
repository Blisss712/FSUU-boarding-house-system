-- ============================================================================
--  Real map coordinates (Leaflet + OpenStreetMap)
--  Run once in Supabase → SQL Editor → New query. Safe to re-run.
-- ============================================================================
--
-- The old dummy map stored a percentage position ({x: 0-100, y: 0-100}) in
-- "mapCoordinates". The real map needs WGS84 latitude/longitude instead.
-- The app still understands "mapCoordinates" as a fallback, so nothing breaks
-- for pads that have not been pinned yet.
-- ============================================================================

ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude  NUMERIC(9, 6);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6);

COMMENT ON COLUMN properties.latitude IS
  'Exact map latitude (WGS84) set by the landlord. NULL = derive from "mapCoordinates" or campus fallback.';
COMMENT ON COLUMN properties.longitude IS
  'Exact map longitude (WGS84) set by the landlord.';

CREATE INDEX IF NOT EXISTS properties_latitude_longitude_idx
  ON properties (latitude, longitude);

-- Reject impossible coordinates even if the API is called directly.
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_lat_lng_range;
ALTER TABLE properties
  ADD CONSTRAINT properties_lat_lng_range CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  );

-- ----------------------------------------------------------------------------
-- Optional one-time backfill.
-- Pads that already had a custom position on the old dummy map keep roughly the
-- same spot, projected onto a ~400m box around FSUU Main Campus.
-- Pads still on the default {x:50,y:50} stay NULL and the app spreads them
-- deterministically around campus instead of stacking them on one point.
-- Data © OpenStreetMap contributors (campus relation 13106278).
-- ----------------------------------------------------------------------------
UPDATE properties
SET latitude  = 8.9481639 + ((50 - COALESCE(("mapCoordinates" ->> 'y')::numeric, 50)) / 50) * 0.0035,
    longitude = 125.5418283 + ((COALESCE(("mapCoordinates" ->> 'x')::numeric, 50) - 50) / 50) * 0.0035
WHERE latitude IS NULL
  AND longitude IS NULL
  AND "mapCoordinates" IS DISTINCT FROM '{"x": 50, "y": 50}'::jsonb
  AND ("mapCoordinates" ->> 'x') ~ '^-?[0-9]+(\.[0-9]+)?$'
  AND ("mapCoordinates" ->> 'y') ~ '^-?[0-9]+(\.[0-9]+)?$';
