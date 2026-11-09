/**
 * Campus distance helpers.
 *
 * A pad stores its gate proximity in `gateProximities.mainSFGate`:
 *   { walkingMinutes, distanceMeters, commuteMinutes?, feedMode? }
 *
 * `feedMode` is the landlord's choice of what the student feed (pad cards)
 * should advertise: 'walk' (default) or 'commute'. The pad profile always
 * shows both, so students can compare a 15 minute walk against a 5 minute ride.
 *
 * Distances are shown in metres below 1 km and in kilometres from 1 km up
 * (e.g. "1.00 km", "2.35 km").
 *
 * Since the landlord editor derives those numbers from the map pin, this module
 * also owns the geodesy: `distanceMetersBetween` is a pure great-circle
 * calculation, so a pin change never needs the network, an API key or a routing
 * service. Swapping in routed (street-following) distances later only requires
 * replacing the metres that reach `normalizeDistanceMeters`.
 */

// Average walking pace used across the app (filters assume 75 m per minute).
export const WALK_METERS_PER_MINUTE = 75;

// Typical Butuan City tricycle / jeepney pace once moving, including stops.
export const RIDE_METERS_PER_MINUTE = 250;

// Time spent waiting for a ride at the gate.
export const RIDE_WAIT_MINUTES = 2;

// The campus distance is the number the feed badges, the meter filters and the
// AI search all rely on, so it needs the same guard rails everywhere.
export const MIN_DISTANCE_METERS = 20;
export const MAX_DISTANCE_METERS = 10000;
// Auto-calculated distances snap to this step: a pin should read "450 m", never
// "447.28139 m".
export const DISTANCE_ROUNDING_METERS = 10;

// Mean Earth radius (IUGG), metres.
const EARTH_RADIUS_METERS = 6371008.8;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance in metres between two `{ lat, lng }` points.
 *
 * This is the "as the crow flies" line a landlord sees while pinning. It is
 * deliberately offline and dependency-free: it runs on every pin click, drag
 * end and GPS fix, so it must never wait on a third-party routing API.
 * Returns 0 when either point is incomplete.
 */
export function distanceMetersBetween(from, to) {
  const aLat = Number(from?.lat);
  const aLng = Number(from?.lng);
  const bLat = Number(to?.lat);
  const bLng = Number(to?.lng);
  if (![aLat, aLng, bLat, bLng].every(Number.isFinite)) return 0;

  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Snap a raw metre value to the nearest 10 m and keep it inside the range the
 * editor inputs (`min=20`, `max=10000`) accept — otherwise a pin dropped on the
 * campus itself (0 m) or far across the city would make the form impossible to
 * submit. A blank/unparseable value is reported as 0, meaning "no measurement".
 */
export function normalizeDistanceMeters(meters) {
  const n = typeof meters === 'number' ? meters : parseFloat(meters);
  if (!Number.isFinite(n)) return 0;
  const snapped = Math.round(Math.max(0, n) / DISTANCE_ROUNDING_METERS) * DISTANCE_ROUNDING_METERS;
  return Math.min(MAX_DISTANCE_METERS, Math.max(MIN_DISTANCE_METERS, snapped));
}

function toMeters(value) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function estimateWalkMinutes(meters) {
  const m = toMeters(meters);
  if (!m) return 0;
  return Math.max(1, Math.round(m / WALK_METERS_PER_MINUTE));
}

export function estimateCommuteMinutes(meters) {
  const m = toMeters(meters);
  if (!m) return 0;
  return Math.max(2, Math.round(m / RIDE_METERS_PER_MINUTE) + RIDE_WAIT_MINUTES);
}

/** "850 m" below 1 km, "1.00 km" from 1 km up. */
export function formatDistance(meters) {
  const m = toMeters(meters);
  if (!m) return '';
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

/**
 * Everything the UI needs to describe how far a pad is from the main gate.
 * Returns null when the pad has no proximity data at all.
 */
export function getGateDistance(property) {
  const gate = property?.gateProximities?.mainSFGate;
  if (!gate) return null;

  let meters = toMeters(gate.distanceMeters);
  const storedWalk = toMeters(gate.walkingMinutes);

  // Older pads may only carry one of the two numbers.
  if (!meters && storedWalk) meters = storedWalk * WALK_METERS_PER_MINUTE;

  let walkMinutes = storedWalk || estimateWalkMinutes(meters);

  const storedRide = toMeters(gate.commuteMinutes);
  const commuteMinutes = storedRide || estimateCommuteMinutes(meters);

  if (!meters && !walkMinutes && !commuteMinutes) return null;
  if (!walkMinutes) walkMinutes = estimateWalkMinutes(meters) || 0;

  const mode = gate.feedMode === 'commute' ? 'commute' : 'walk';
  const isRide = mode === 'commute';
  const minutes = isRide ? commuteMinutes || walkMinutes : walkMinutes;
  const distanceLabel = formatDistance(meters);

  return {
    mode,
    isRide,
    meters,
    distanceLabel,
    walkMinutes,
    commuteMinutes: commuteMinutes || walkMinutes,
    minutes,
    minutesLabel: `${minutes} min ${isRide ? 'ride' : 'walk'}`,
    badgeLabel: distanceLabel ? `${minutes} min ${isRide ? 'ride' : 'walk'} · ${distanceLabel}` : `${minutes} min ${isRide ? 'ride' : 'walk'}`
  };
}
