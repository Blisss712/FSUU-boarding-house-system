/**
 * src/services/routeApi.js
 * Browser client for the walking-route proxy (`/api/route`).
 *
 * The landlord editor calls `getWalkingRoute()` whenever the pin moves. This
 * module is deliberately forgiving: it never throws, applies a timeout, and
 * caches results (memory + localStorage) so nudging the same pin twice — or
 * reopening the same pad — costs no routing requests at all.
 *
 * Every failure resolves `{ ok: false, error }` and the caller falls back to the
 * straight-line estimate, so a blocked proxy, an offline device or a routing
 * outage can never stop a landlord from publishing a pad.
 */

const CACHE_STORAGE_KEY = 'balay-urios:walking-routes:v1';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const REQUEST_TIMEOUT_MS = 9000;
const MAX_GEOMETRY_POINTS = 200;

/** ~1 m of precision: a pin drag that small should reuse the cached route. */
function roundCoordinate(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(5)) : NaN;
}

function cacheKey(from, to) {
  return `${roundCoordinate(from?.lat)},${roundCoordinate(from?.lng)}`
    + `>${roundCoordinate(to?.lat)},${roundCoordinate(to?.lng)}`;
}

const memoryCache = new Map();

function readStoredCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredCache(entries) {
  try {
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Private mode / quota: the memory cache still works for this session.
  }
}

function readCachedRoute(key) {
  const now = Date.now();

  const inMemory = memoryCache.get(key);
  if (inMemory && now - inMemory.savedAt < CACHE_TTL_MS) return inMemory.route;

  const stored = readStoredCache()[key];
  if (stored && Number.isFinite(stored.savedAt) && now - stored.savedAt < CACHE_TTL_MS) {
    return stored.route || null;
  }

  return null;
}

function storeCachedRoute(key, route) {
  memoryCache.set(key, { route, savedAt: Date.now() });

  const entries = readStoredCache();
  entries[key] = { route, savedAt: Date.now() };

  // Keep the cache bounded, oldest first.
  const keys = Object.keys(entries);
  if (keys.length > MAX_CACHE_ENTRIES) {
    keys
      .sort((a, b) => (entries[a]?.savedAt || 0) - (entries[b]?.savedAt || 0))
      .slice(0, keys.length - MAX_CACHE_ENTRIES)
      .forEach((stale) => delete entries[stale]);
  }

  writeStoredCache(entries);
}

function sanitizeGeometry(geometry) {
  if (!Array.isArray(geometry)) return [];
  const points = [];
  for (const pair of geometry) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const lat = Number(pair[0]);
    const lng = Number(pair[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const previous = points[points.length - 1];
    if (previous && previous[0] === lat && previous[1] === lng) continue;
    points.push([lat, lng]);
  }
  if (points.length <= MAX_GEOMETRY_POINTS) return points;
  const step = points.length / MAX_GEOMETRY_POINTS;
  const sampled = [];
  for (let i = 0; i < MAX_GEOMETRY_POINTS - 1; i += 1) {
    sampled.push(points[Math.min(points.length - 1, Math.round(i * step))]);
  }
  sampled.push(points[points.length - 1]);
  return sampled;
}

function normalizeRoute(payload) {
  const distanceMeters = Number(payload?.distanceMeters);
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return null;

  return {
    provider: String(payload?.provider || 'osrm-foot'),
    distanceMeters,
    durationSeconds: Number(payload?.durationSeconds) > 0 ? Number(payload.durationSeconds) : 0,
    snappedFromMeters: Number(payload?.snappedFromMeters) > 0 ? Number(payload.snappedFromMeters) : 0,
    geometry: sanitizeGeometry(payload?.geometry)
  };
}

/**
 * Walking distance between two points, via the same-origin proxy.
 * Resolves `{ ok: true, distanceMeters, durationSeconds, geometry, … }` or
 * `{ ok: false, error: { code, message } }` — never rejects.
 */
export async function getWalkingRoute({ from, to }) {
  const key = cacheKey(from, to);

  if (!Number.isFinite(roundCoordinate(from?.lat)) || !Number.isFinite(roundCoordinate(to?.lat))) {
    return { ok: false, error: { code: 'invalid-point', message: 'A pin and a campus point are required.' } };
  }

  const cached = readCachedRoute(key);
  if (cached) return { ok: true, ...cached, cached: true };

  const params = new URLSearchParams({
    from: `${roundCoordinate(from.lat)},${roundCoordinate(from.lng)}`,
    to: `${roundCoordinate(to.lat)},${roundCoordinate(to.lng)}`
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/route?${params.toString()}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' }
    });

    // Static hosting without the serverless function answers with index.html;
    // treat anything that is not JSON as "routing unavailable".
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('json')) {
      return { ok: false, error: { code: 'routing-unavailable', message: 'The routing proxy is not available here.' } };
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        error: {
          code: payload?.error?.code || 'routing-failed',
          message: payload?.error?.message || 'The walking route could not be calculated.'
        }
      };
    }

    const route = normalizeRoute(payload);
    if (!route) {
      return { ok: false, error: { code: 'no-route', message: 'The routing service returned no usable route.' } };
    }

    storeCachedRoute(key, route);
    return { ok: true, ...route };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: error?.name === 'AbortError' ? 'timeout' : 'routing-unavailable',
        message: error?.name === 'AbortError'
          ? 'The walking route took too long to calculate.'
          : 'The walking route could not be reached.'
      }
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Test seam: clearing the cache in dev tools or unit tests. */
export function clearWalkingRouteCache() {
  memoryCache.clear();
  try {
    window.localStorage.removeItem(CACHE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
