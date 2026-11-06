/**
 * Balay Urios — local Gemini proxy for the AI Student-Needs Search.
 *
 * The browser never sees the API key. The React app POSTs the student's sentence
 * plus the compact listing catalog to `/api/ai-search`; this middleware attaches
 * `GEMINI_API_KEY` (read from `.env` on the dev server), calls Google through the
 * shared server core (`src/services/ai/aiServer.js`), and returns the raw JSON
 * text for the client to validate.
 *
 * It is wired into both `npm run dev` (configureServer) and `npm run preview`
 * (configurePreviewServer), so the feature works in a production build preview
 * without ever bundling a secret into `dist/`. On a real deployment the same core
 * runs inside `api/ai-search.js` and `api/ai-status.js` (Vercel functions).
 *
 * Environment (all optional except the key):
 *   GEMINI_API_KEY        Google AI Studio key — required for AI search
 *   GEMINI_MODEL          primary model, default gemini-3.6-flash
 *   GEMINI_API_BASE_URL   default https://generativelanguage.googleapis.com/v1beta
 */

import { loadEnv } from 'vite';
import {
  aiStatusBody,
  createRateLimiter,
  readAiSettings,
  runAiSearch
} from '../src/services/ai/aiServer.js';

const MAX_BODY_BYTES = 3 * 1024 * 1024;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        const error = new Error('Request body is too large.');
        error.code = 'body-too-large';
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('error', (error) => {
      error.code = error.code || 'body-read-failed';
      reject(error);
    });

    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        const error = new Error('Request body is not valid JSON.');
        error.code = 'invalid-body';
        reject(error);
      }
    });
  });
}

export function aiSearchProxy() {
  let settings = { apiKey: '', baseUrl: '', models: [] };
  const isRateLimited = createRateLimiter();

  const handler = async function aiProxyMiddleware(req, res, next) {
    const url = new URL(req.url || '/', 'http://localhost');

    // A cheap, non-secret health check the UI uses to decide whether to show the
    // AI entry points at all, or a "finish the setup" panel instead.
    if (url.pathname === '/api/ai-status') {
      sendJson(res, 200, aiStatusBody(settings));
      return;
    }

    if (url.pathname !== '/api/ai-search') {
      next();
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: { code: 'method-not-allowed', message: 'Use POST for /api/ai-search.' } });
      return;
    }

    if (!settings.apiKey) {
      sendJson(res, 503, {
        error: {
          code: 'not-configured',
          message: 'AI search is not configured. Add GEMINI_API_KEY to .env and restart the dev server.'
        }
      });
      return;
    }

    const clientKey = req.socket?.remoteAddress || 'local';
    if (isRateLimited(clientKey)) {
      sendJson(res, 429, {
        error: { code: 'rate-limited', message: 'Too many AI searches in a minute. Take a short pause and try again.' }
      });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { error: { code: error.code || 'invalid-body', message: error.message } });
      return;
    }

    const { status, body: payload } = await runAiSearch({
      settings,
      query: body?.query,
      catalog: body?.catalog,
      zones: Array.isArray(body?.zones) ? body.zones : [],
      amenities: Array.isArray(body?.amenities) ? body.amenities : []
    });

    sendJson(res, status, payload);
  };

  return {
    name: 'balay-urios-ai-proxy',

    configResolved(config) {
      const envDir = config.envDir || config.root;
      const env = loadEnv(config.mode, envDir, '');

      settings = readAiSettings({
        ...env,
        GEMINI_API_KEY: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY
          || env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY,
        GEMINI_MODEL: env.GEMINI_MODEL || process.env.GEMINI_MODEL,
        GEMINI_API_BASE_URL: env.GEMINI_API_BASE_URL || process.env.GEMINI_API_BASE_URL
      });

      if (config.command === 'serve') {
        console.log(
          `[ai-search] ${settings.apiKey
            ? `Gemini proxy ready (${settings.models[0]})`
            : 'GEMINI_API_KEY missing — AI search will show setup instructions'}`
        );
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

export default aiSearchProxy;
