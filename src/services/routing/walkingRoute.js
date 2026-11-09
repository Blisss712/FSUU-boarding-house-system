/**
 * Balay Urios — walking-route core (OSRM foot profile).
 *
 * Framework-free request logic shared by:
 *   - api/route.js                 (Vercel serverless function)
 *   - scripts/vite-route-proxy.js  (local dev + `vite preview` middleware)
 *
 * Why a proxy at all? The deployed CSP (`vercel.json` → `connect-src 'self'`)
 * blocks the browser from calling any third-party host, so routing has to go
 * through our own origin. Keeping it server-side also means the client never
 * depends on a specific provider: swapping OSRM for ORS/GraphHopper/Valhalla is
 * a change to this file alone.
 *
 * Endpoint note: `routing.openstreetmap.de` is the FOSSGIS-run OSRM demo server.
 * Its foot instance is addressed as `/routed-foot/route/v1/driving/...` — the
 * "driving" segment is a path quirk of that deployment; the profile actually
 * applied is walking (verified: 180 m costs ~144 s, i.e. 4.5 km/h). The plain
 * `router.project-osrm.org/route/v1/foot/...` endpoint accepts the URL but
 * answers with car speeds, which is why it is not used here.
 *
 * Usage policy: no key, but FOSSGIS asks for ≤1 request/second, no commercial
 * mass-querying and offers no uptime guarantee. The editor only calls on a pin
 * change, the client caches per coordinate pair, and the function sends CDN
 * cache headers — so normal landlord traffic is a tiny fraction of that budget.
 */

export const DEFAULT_OSRM_BASE_URL = 'https://routing.openstreetmap.de/routed-foot';
export const ROUTE_TIMEOUT_MS = 7000;
/** CDN/browser cache lifetime for a successful route (1 day). */
export const ROUTE_CACHE_SECONDS = 86_400;
/** A pin further than this from the nearest mapped street is worth flagging. */
export const MAX_SNAP_METERS = 250;
/** Cap on stored geometry points, so a long route cannot bloat the JSONB row. */
export const MAX_GEOMETRY_POINTS = 200;

export class RouteError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RouteError';
    this.code = code;
  }
}

/** Optional self-hosting / provider override, read on the server only. */
export function readRouteSettings(env = {}) {
  return {
    baseUrl: String(env.OSRM_FOOT_BASE_URL || DEFAULT_OSRM_BASE_URL).trim().replace(/\/+$/, '')
  };
}

/**
 * Accepts `{ lat, lng }` or the `"lat,lng"` form used in the query string.
 * Returns `null` for anything that is not a usable WGS84 point ("0,0" is the
 * classic empty-value accident, so it is rejected too).
 */
export function parseRoutePoint(value) {
  let lat;
  let lng;

  if (typeof value === 'string') {
    const parts = value.split(',');
    if (parts.length !== 2) return null;
    lat = Number(parts[0]);
    lng = Number(parts[1]);
  } else if (value && typeof value === 'object') {
    lat = Number(value.lat);
    lng = Number(value.lng ?? value.lon);
  } else {
    return null;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;

  return { lat, lng };
}

/** OSRM geojson is [lng, lat]; Leaflet wants [lat, lng]. */
function toLeafletGeometry(geometry) {
  const coordinates = geometry?.type === 'LineString' && Array.isArray(geometry.coordinates)
    ? geometry.coordinates
    : [];

  const points = [];
  for (const pair of coordinates) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const lng = Number(pair[0]);
    const lat = Number(pair[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const next = [Number(lat.toFixed(5)), Number(lng.toFixed(5))];
    // Drop consecutive duplicates (OSRM repeats the snapped origin), otherwise
    // Leaflet draws zero-length segments on the picker.
    const previous = points[points.length - 1];
    if (previous && previous[0] === next[0] && previous[1] === next[1]) continue;
    points.push(next);
  }

  if (points.length <= MAX_GEOMETRY_POINTS) return points;

  // Evenly sample down to the cap, always keeping the last point.
  const step = points.length / MAX_GEOMETRY_POINTS;
  const sampled = [];
  for (let i = 0; i < MAX_GEOMETRY_POINTS - 1; i += 1) {
    sampled.push(points[Math.min(points.length - 1, Math.round(i * step))]);
  }
  sampled.push(points[points.length - 1]);
  return sampled;
}

/**
 * Ask the routing server for the walking route between two points.
 * Resolves `{ provider, distanceMeters, durationSeconds, geometry, snappedFromMeters, snappedToMeters }`
 * or throws a `RouteError` with a machine-readable `code`.
 */
export async function fetchWalkingRoute({
  from,
  to,
  settings = readRouteSettings(),
  fetchImpl = globalThis.fetch,
  timeoutMs = ROUTE_TIMEOUT_MS
}) {
  const origin = parseRoutePoint(from);
  if (!origin) throw new RouteError('invalid-from', 'The starting point is not a valid coordinate pair.');
  const destination = parseRoutePoint(to);
  if (!destination) throw new RouteError('invalid-to', 'The destination is not a valid coordinate pair.');

  if (typeof fetchImpl !== 'function') {
    throw new RouteError('routing-unavailable', 'No fetch implementation is available on this runtime.');
  }

  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  // `overview=full` keeps the street shape readable on the picker map; the
  // geometry is trimmed to MAX_GEOMETRY_POINTS before it is returned or stored.
  const url = `${settings.baseUrl}/route/v1/driving/${coords}`
    + '?overview=full&geometries=geojson&steps=false&alternatives=false';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' }
    });

    if (!response.ok) {
      throw new RouteError('routing-unavailable', `The routing service returned HTTP ${response.status}.`);
    }

    const data = await response.json();
    if (data?.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
      throw new RouteError('no-route', data?.message || 'No walking route was found between those points.');
    }

    const route = data.routes[0];
    const distanceMeters = Number(route.distance);
    const durationSeconds = Number(route.duration);
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
      throw new RouteError('no-route', 'The routing service returned a route with no measurable length.');
    }

    const waypoints = Array.isArray(data.waypoints) ? data.waypoints : [];

    return {
      provider: 'osrm-foot',
      distanceMeters,
      durationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0,
      geometry: toLeafletGeometry(route.geometry),
      snappedFromMeters: Number(waypoints[0]?.distance) || 0,
      snappedToMeters: Number(waypoints[1]?.distance) || 0
    };
  } catch (error) {
    if (error instanceof RouteError) throw error;
    if (error?.name === 'AbortError') {
      throw new RouteError('timeout', 'The routing service took too long to answer.');
    }
    throw new RouteError('routing-unavailable', 'The routing service could not be reached.');
  } finally {
    clearTimeout(timer);
  }
}

/** Uniform error payload for both the function and the dev middleware. */
export function routeErrorBody(error) {
  return {
    ok: false,
    error: {
      code: error?.code || 'routing-failed',
      message: error?.message || 'The walking route could not be calculated.'
    }
  };
}
