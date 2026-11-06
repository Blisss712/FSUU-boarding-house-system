/**
 * Balay Urios — local Gemini proxy for the AI Student-Needs Search.
 *
 * The browser never sees the API key. The React app POSTs the student's sentence
 * plus the compact listing catalog to `/api/ai-search`; this middleware attaches
 * `GEMINI_API_KEY` (read from `.env` on the dev server), calls Google, and
 * returns the raw JSON text for the client to validate.
 *
 * It is wired into both `npm run dev` (configureServer) and `npm run preview`
 * (configurePreviewServer), so the feature works in a production build preview
 * without ever bundling a secret into `dist/`.
 *
 * Environment (all optional except the key):
 *   GEMINI_API_KEY        Google AI Studio key — required for AI search
 *   GEMINI_MODEL          primary model, default gemini-3.6-flash
 *   GEMINI_API_BASE_URL   default https://generativelanguage.googleapis.com/v1beta
 */

import { loadEnv } from 'vite';
import { AI_DEFAULT_MODELS, AI_MAX_CATALOG, buildGeminiRequest } from '../src/services/ai/aiNeeds.js';

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_BODY_BYTES = 3 * 1024 * 1024;
/** Per-model cap. A full 60-listing answer takes ~30s, so this leaves headroom. */
const REQUEST_TIMEOUT_MS = 45_000;
/** Whole-request budget across fallbacks, so one hung model cannot stall forever. */
const TOTAL_BUDGET_MS = 90_000;
/** Do not start another model attempt with less time than this left. */
const MIN_ATTEMPT_MS = 12_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(body);
}

function sendError(res, status, code, message) {
  sendJson(res, status, { error: { code, message } });
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

function createRateLimiter() {
  const hits = new Map();

  return function isRateLimited(key) {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
      hits.set(key, recent);
      return true;
    }
    recent.push(now);
    hits.set(key, recent);

    // Opportunistic cleanup so a long dev session cannot grow the map forever.
    if (hits.size > 500) {
      for (const [entryKey, times] of hits) {
        if (!times.some((time) => now - time < RATE_LIMIT_WINDOW_MS)) hits.delete(entryKey);
      }
    }
    return false;
  };
}

/** One Gemini call. Never throws for HTTP errors; returns a discriminated result. */
async function callGemini({ apiKey, baseUrl, model, payload, timeoutMs = REQUEST_TIMEOUT_MS }) {
  let response;
  try {
    response = await fetch(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    return {
      ok: false,
      code: error?.name === 'TimeoutError' ? 'timeout' : 'upstream',
      status: 0,
      message: error?.name === 'TimeoutError'
        ? 'Gemini took too long to answer.'
        : `Could not reach Gemini: ${error?.message || 'network error'}`
    };
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      code: data?.error?.status || '',
      status: response.status,
      message: data?.error?.message || `Gemini responded with HTTP ${response.status}.`
    };
  }

  const candidate = data?.candidates?.[0];
  const text = (candidate?.content?.parts || [])
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  return {
    ok: Boolean(text),
    code: text ? '' : 'empty-response',
    status: response.status,
    message: text ? '' : 'Gemini returned no text (the prompt may have been blocked).',
    text,
    model,
    usage: data?.usageMetadata || null,
    finishReason: candidate?.finishReason || null,
    blockReason: data?.promptFeedback?.blockReason || null
  };
}

/** Translate a Google failure into the app's small set of error codes. */
function classifyGeminiFailure(result) {
  const message = String(result.message || '');
  const status = result.status;

  if (result.code === 'timeout') {
    return {
      status: 504,
      code: 'timeout',
      message: 'Gemini took too long to answer. Please try again.',
      retryNextModel: true
    };
  }

  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return {
      status: 429,
      code: 'rate-limited',
      message: 'Gemini is rate-limited right now (free-tier quota). Wait a minute and try again.'
    };
  }

  if (status === 503 || result.code === 'UNAVAILABLE' || /high demand|overloaded|temporarily unavailable/i.test(message)) {
    return {
      status: 503,
      code: 'overloaded',
      message: 'Gemini is busy right now. Please try again in a moment.',
      retryNextModel: true
    };
  }

  if (status === 401 || status === 403 || /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)) {
    return {
      status: 502,
      code: 'invalid-key',
      message: 'Gemini rejected the API key. Check GEMINI_API_KEY in .env and restart the dev server.'
    };
  }

  if (status === 400 && /thinking|thinkingConfig/i.test(message)) {
    return { status: 502, code: 'thinking-unsupported', message, retryWithoutThinking: true };
  }

  if (status === 404 || (status === 400 && /model|not found|not supported/i.test(message))) {
    return { status: 502, code: 'model-unavailable', message, retryNextModel: true };
  }

  if (result.code === 'empty-response') {
    return { status: 502, code: 'blocked', message: 'Gemini returned an empty answer. Rephrase the request and try again.' };
  }

  return { status: 502, code: 'upstream', message: message || 'Gemini request failed.' };
}

export function aiSearchProxy() {
  const settings = {
    apiKey: '',
    baseUrl: DEFAULT_BASE_URL,
    models: []
  };
  const isRateLimited = createRateLimiter();

  const handler = async function aiProxyMiddleware(req, res, next) {
    const url = new URL(req.url || '/', 'http://localhost');

    // A cheap, non-secret health check the UI uses to decide whether to show the
    // AI entry points at all, or a "finish the setup" panel instead.
    if (url.pathname === '/api/ai-status') {
      sendJson(res, 200, {
        ok: true,
        configured: Boolean(settings.apiKey),
        source: 'proxy',
        model: settings.models[0] || AI_DEFAULT_MODELS[0],
        models: settings.models
      });
      return;
    }

    if (url.pathname !== '/api/ai-search') {
      next();
      return;
    }

    if (req.method !== 'POST') {
      sendError(res, 405, 'method-not-allowed', 'Use POST for /api/ai-search.');
      return;
    }

    if (!settings.apiKey) {
      sendError(
        res,
        503,
        'not-configured',
        'AI search is not configured. Add GEMINI_API_KEY to .env and restart the dev server.'
      );
      return;
    }

    const clientKey = req.socket?.remoteAddress || 'local';
    if (isRateLimited(clientKey)) {
      sendError(res, 429, 'rate-limited', 'Too many AI searches in a minute. Take a short pause and try again.');
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendError(res, 400, error.code || 'invalid-body', error.message);
      return;
    }

    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    const catalog = Array.isArray(body?.catalog) ? body.catalog : [];
    const zones = Array.isArray(body?.zones) ? body.zones : [];
    const amenities = Array.isArray(body?.amenities) ? body.amenities : [];

    if (query.length < 3) {
      sendError(res, 400, 'query-too-short', 'Describe what you need in a sentence first.');
      return;
    }
    if (query.length > 1200) {
      sendError(res, 400, 'query-too-long', 'That message is too long. Keep it under about 1,200 characters.');
      return;
    }
    if (catalog.length === 0) {
      sendError(res, 422, 'empty-catalog', 'There are no listings to search yet.');
      return;
    }
    if (catalog.length > AI_MAX_CATALOG * 2) {
      sendError(res, 413, 'catalog-too-large', 'The listing catalog is too large for one AI request.');
      return;
    }

    const modelsToTry = (settings.models.length ? settings.models : AI_DEFAULT_MODELS).slice(0, 4);
    const startedAt = Date.now();
    const deadline = startedAt + TOTAL_BUDGET_MS;
    let lastFailure = null;

    for (let index = 0; index < modelsToTry.length; index += 1) {
      const remaining = deadline - Date.now();
      if (remaining < MIN_ATTEMPT_MS) break;

      const model = modelsToTry[index];
      const attemptTimeout = Math.min(REQUEST_TIMEOUT_MS, remaining);
      let payload = buildGeminiRequest({ query, catalog, zones, amenities, model });
      let result = await callGemini({
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl,
        model,
        payload,
        timeoutMs: attemptTimeout
      });

      // Gemini 2.5/3 models accept thinkingConfig; older/aliased ones may not.
      if (!result.ok && result.status === 400 && /thinkingConfig|thinking/i.test(result.message || '')) {
        const { thinkingConfig, ...generationConfig } = payload.generationConfig || {};
        void thinkingConfig;
        payload = { ...payload, generationConfig };
        const retryBudget = Math.max(MIN_ATTEMPT_MS, deadline - Date.now());
        result = await callGemini({
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          model,
          payload,
          timeoutMs: Math.min(REQUEST_TIMEOUT_MS, retryBudget)
        });
      }

      if (result.ok) {
        // A MAX_TOKENS answer is cut mid-JSON; fail clearly instead of handing
        // the client something that cannot be parsed.
        if (result.finishReason === 'MAX_TOKENS') {
          console.warn(`[ai-search] ${model} hit the output limit (${Date.now() - startedAt}ms)`);
          sendError(
            res,
            502,
            'truncated',
            'The AI answer was too long to finish. Try a shorter message or fewer must-haves.'
          );
          return;
        }

        console.log(
          `[ai-search] ${model} · ${query.length} chars · ${catalog.length} listings · ${Date.now() - startedAt}ms`
        );
        sendJson(res, 200, {
          ok: true,
          text: result.text,
          model,
          usage: result.usage,
          finishReason: result.finishReason
        });
        return;
      }

      const failure = classifyGeminiFailure(result);
      lastFailure = failure;

      const redacted = String(failure.message || '').split(settings.apiKey).join('[redacted]');
      console.warn(`[ai-search] ${model} failed (${failure.code || result.status}): ${redacted}`);

      if (failure.retryNextModel && index < modelsToTry.length - 1
        && deadline - Date.now() >= MIN_ATTEMPT_MS) {
        continue;
      }

      sendError(
        res,
        failure.status || 502,
        failure.code || 'upstream',
        redacted || 'The AI request failed.'
      );
      return;
    }

    sendError(
      res,
      lastFailure?.status || 504,
      lastFailure?.code || 'timeout',
      lastFailure?.message || 'Gemini took too long to answer. Please try again.'
    );
  };

  return {
    name: 'balay-urios-ai-proxy',

    configResolved(config) {
      const envDir = config.envDir || config.root;
      const env = loadEnv(config.mode, envDir, '');

      const apiKey = String(
        env.GEMINI_API_KEY || process.env.GEMINI_API_KEY
        || env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
        || ''
      ).trim();

      const primary = String(env.GEMINI_MODEL || process.env.GEMINI_MODEL || '').trim();
      const fallbacks = AI_DEFAULT_MODELS.filter((model) => model !== primary);

      settings.apiKey = apiKey;
      settings.baseUrl = String(
        env.GEMINI_API_BASE_URL || process.env.GEMINI_API_BASE_URL || DEFAULT_BASE_URL
      ).trim().replace(/\/+$/, '');
      settings.models = primary ? [primary, ...fallbacks] : [...AI_DEFAULT_MODELS];

      if (config.command === 'serve') {
        console.log(
          `[ai-search] ${apiKey
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
