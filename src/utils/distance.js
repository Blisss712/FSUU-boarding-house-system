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
 */

// Average walking pace used across the app (filters assume 75 m per minute).
export const WALK_METERS_PER_MINUTE = 75;

// Typical Butuan City tricycle / jeepney pace once moving, including stops.
export const RIDE_METERS_PER_MINUTE = 250;

// Time spent waiting for a ride at the gate.
export const RIDE_WAIT_MINUTES = 2;

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
