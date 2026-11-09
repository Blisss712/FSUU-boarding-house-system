/**
 * Balay Urios — local walking-route proxy for `npm run dev` / `npm run preview`.
 *
 * Mirrors `api/route.js` so the landlord editor's pin-to-campus routing works on
 * http://localhost exactly as it does on Vercel: the browser calls the
 * same-origin `/api/route`, this middleware performs the OSRM request through the
 * shared core (`src/services/routing/walkingRoute.js`) and returns JSON.
 *
 * Optional env:
 *   OSRM_FOOT_BASE_URL   self-hosted OSRM/Valhalla base (defaults to the FOSSGIS
 *                        foot server, `https://routing.openstreetmap.de/routed-foot`)
 */

import { loadEnv } from 'vite';
import {
  fetchWalkingRoute,
  readRouteSettings,
  routeErrorBody,
  RouteError,
  ROUTE_CACHE_SECONDS
} from '../src/services/routing/walkingRoute.js';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;

function sendJson(res, status, payload, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
  res.end(JSON.stringify(payload));
}

export function routeProxy() {
  let settings = readRouteSettings(process.env);
  const hits = new Map();

  const isRateLimited = (key) => {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
      hits.set(key, { start: now, count: 1 });
      return false;
    }
    entry.count += 1;
    return entry.count > RATE_LIMIT_MAX_REQUESTS;
  };

  const handler = async function routeProxyMiddleware(req, res, next) {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname !== '/api/route') {
      next();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, routeErrorBody(new RouteError('method-not-allowed', 'Use GET for /api/route.')), {
        allow: 'GET, HEAD',
        'cache-control': 'no-store'
      });
      return;
    }

    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (!from || !to) {
      sendJson(res, 400, routeErrorBody(new RouteError('missing-parameter', 'Both `from` and `to` are required, as lat,lng.')), {
        'cache-control': 'no-store'
      });
      return;
    }

    if (isRateLimited(req.socket?.remoteAddress || 'local')) {
      sendJson(res, 429, routeErrorBody(new RouteError('rate-limited', 'Too many route requests in a minute. Try again shortly.')), {
        'cache-control': 'no-store'
      });
      return;
    }

    try {
      const route = await fetchWalkingRoute({ from, to, settings });
      sendJson(res, 200, { ok: true, ...route }, {
        'cache-control': `public, max-age=${ROUTE_CACHE_SECONDS}`
      });
    } catch (error) {
      const isClientError = error instanceof RouteError
        && (error.code === 'invalid-from' || error.code === 'invalid-to');
      sendJson(res, isClientError ? 400 : 502, routeErrorBody(error), { 'cache-control': 'no-store' });
    }
  };

  return {
    name: 'balay-urios-route-proxy',

    configResolved(config) {
      const envDir = config.envDir || config.root;
      const env = loadEnv(config.mode, envDir, '');
      settings = readRouteSettings({
        ...env,
        OSRM_FOOT_BASE_URL: env.OSRM_FOOT_BASE_URL || process.env.OSRM_FOOT_BASE_URL
      });

      if (config.command === 'serve') {
        console.log(`[walking-route] OSRM proxy ready (${settings.baseUrl})`);
      }
    },

    configureServer(server) {
      server.middlewares.use(handler);
    },

    configurePreviewServer(server) {
      server.middlewares.use(handler);
    }
  };
}

export default routeProxy;
