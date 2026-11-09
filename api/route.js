/**
 * Vercel serverless function — pedestrian route proxy (`GET /api/route`).
 *
 * The landlord editor asks for the walking distance from the dropped pin to the
 * FSUU campus point. The browser cannot call a routing host directly because the
 * CSP in `vercel.json` only allows `connect-src 'self'`, so this same-origin
 * function does it and returns a compact JSON payload.
 *
 * Query:
 *   from=lat,lng   (the pin)
 *   to=lat,lng     (the campus / gate)
 *
 * Response (200):
 *   { ok: true, provider, distanceMeters, durationSeconds, geometry: [[lat,lng]…],
 *     snappedFromMeters, snappedToMeters }
 * Response (4xx/5xx):
 *   { ok: false, error: { code, message } }
 *
 * No key is required. Optional env: `OSRM_FOOT_BASE_URL` to point at a
 * self-hosted OSRM/Valhalla instance instead of the FOSSGIS demo server.
 */

import {
  fetchWalkingRoute,
  readRouteSettings,
  routeErrorBody,
  RouteError,
  ROUTE_CACHE_SECONDS
} from '../src/services/routing/walkingRoute.js';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;

/** Per-instance limiter; the CDN cache below is the real volume control. */
const hits = new Map();

function isRateLimited(key) {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    hits.set(key, { start: now, count: 1 });
    return false;
  }

  entry.count += 1;
  // Keep the map from growing unbounded on a long-lived instance.
  if (hits.size > 5_000) {
    for (const [candidate, value] of hits) {
      if (now - value.start > RATE_LIMIT_WINDOW_MS) hits.delete(candidate);
    }
  }

  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

function clientKey(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '');
  return forwarded.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('allow', 'GET, HEAD');
    res.setHeader('cache-control', 'no-store');
    res.status(405).json(routeErrorBody(new RouteError('method-not-allowed', 'Use GET for /api/route.')));
    return;
  }

  const url = new URL(req.url || '/', 'https://localhost');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  if (!from || !to) {
    res.setHeader('cache-control', 'no-store');
    res.status(400).json(routeErrorBody(new RouteError('missing-parameter', 'Both `from` and `to` are required, as lat,lng.')));
    return;
  }

  if (isRateLimited(clientKey(req))) {
    res.setHeader('cache-control', 'no-store');
    res.status(429).json(routeErrorBody(new RouteError('rate-limited', 'Too many route requests in a minute. Try again shortly.')));
    return;
  }

  try {
    const route = await fetchWalkingRoute({
      from,
      to,
      settings: readRouteSettings(process.env)
    });

    // Routes between two fixed points are stable for hours, so let the CDN hold
    // them: repeat views of the same pad never touch the routing server.
    res.setHeader('cache-control', `public, s-maxage=${ROUTE_CACHE_SECONDS}, stale-while-revalidate=604800`);
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.status(200).json({ ok: true, ...route });
  } catch (error) {
    const isClientError = error instanceof RouteError
      && (error.code === 'invalid-from' || error.code === 'invalid-to');

    res.setHeader('cache-control', 'no-store');
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.status(isClientError ? 400 : 502).json(routeErrorBody(error));
  }
}
