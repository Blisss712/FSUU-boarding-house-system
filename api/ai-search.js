/**
 * Vercel serverless function — Gemini proxy for the AI Student-Needs Search.
 *
 * Same logic as the local Vite middleware (`scripts/vite-ai-proxy.js`), but the
 * key lives in the hosting provider's server-only environment instead of `.env`.
 *
 * Required env:
 *   GEMINI_API_KEY
 * Optional env:
 *   GEMINI_MODEL, GEMINI_API_BASE_URL
 *   AI_ALLOWED_ORIGIN                 comma-separated browser origins allowed to call this
 *   UPSTASH_REDIS_REST_URL            enables durable rate limiting across instances
 *   UPSTASH_REDIS_REST_TOKEN
 */

import { createRateLimiter, readAiSettings, runAiSearch } from '../src/services/ai/aiServer.js';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;
/** Keep below the function timeout configured in vercel.json (60s). */
const FUNCTION_BUDGET_MS = 55_000;

const localLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS
});

function allowedOrigins() {
  return String(process.env.AI_ALLOWED_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function applyCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = allowedOrigins();
  if (allowed.length === 0) return true;
  if (!allowed.includes(origin)) return false;

  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('vary', 'origin');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, accept');
  return true;
}

function clientKey(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '');
  return forwarded.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

/** Durable limiter when Upstash is configured; per-instance fallback otherwise. */
async function isRateLimited(key) {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();

  if (url && token) {
    try {
      const redisKey = `balay-ai:rate:${key}`;
      const response = await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify([
          ['INCR', redisKey],
          ['PEXPIRE', redisKey, RATE_LIMIT_WINDOW_MS, 'NX']
        ])
      });
      if (response.ok) {
        const data = await response.json();
        const count = Number(data?.[0]?.result);
        if (Number.isFinite(count)) return count > RATE_LIMIT_MAX_REQUESTS;
      }
    } catch {
      // Fall through to the local limiter rather than failing the request.
    }
  }

  return localLimiter(key);
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  if (!applyCors(req, res)) {
    res.status(403).json({ error: { code: 'forbidden-origin', message: 'This origin is not allowed.' } });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST, OPTIONS');
    res.status(405).json({ error: { code: 'method-not-allowed', message: 'Use POST for /api/ai-search.' } });
    return;
  }

  const settings = readAiSettings(process.env);

  if (!settings.apiKey) {
    res.status(503).json({
      error: {
        code: 'not-configured',
        message: 'AI search is not configured. Add GEMINI_API_KEY to the server environment and redeploy.'
      }
    });
    return;
  }

  if (await isRateLimited(clientKey(req))) {
    res.status(429).json({
      error: { code: 'rate-limited', message: 'Too many AI searches in a minute. Take a short pause and try again.' }
    });
    return;
  }

  const body = readBody(req);
  const { status, body: payload } = await runAiSearch({
    settings,
    query: body?.query,
    catalog: body?.catalog,
    zones: Array.isArray(body?.zones) ? body.zones : [],
    amenities: Array.isArray(body?.amenities) ? body.amenities : [],
    totalBudgetMs: FUNCTION_BUDGET_MS
  });

  res.status(status).json(payload);
}
