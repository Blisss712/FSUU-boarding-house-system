/**
 * Balay Urios — Gemini server core for the AI Student-Needs Search.
 *
 * Framework-free request logic shared by:
 *   - scripts/vite-ai-proxy.js  (local dev + `vite preview` middleware)
 *   - api/ai-search.js          (Vercel serverless function)
 *   - api/ai-status.js          (Vercel serverless function)
 *
 * It deliberately knows nothing about `req`/`res`: callers pass plain values in
 * and get `{ status, body }` out. That keeps dev and production on exactly the
 * same prompt, model fallback, timeout and error-mapping behaviour, and makes the
 * whole thing testable without a server.
 */

import { AI_DEFAULT_MODELS, AI_MAX_CATALOG, buildGeminiRequest } from './aiNeeds.js';

export const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/** Per-model cap. A full 60-listing answer takes ~30s, so this leaves headroom. */
export const REQUEST_TIMEOUT_MS = 45_000;
/** Whole-request budget across fallbacks, so one hung model cannot stall forever. */
export const TOTAL_BUDGET_MS = 90_000;
/** Do not start another model attempt with less time than this left. */
export const MIN_ATTEMPT_MS = 12_000;

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 12;

/**
 * Read the server-side settings from any env-shaped object. `VITE_GEMINI_API_KEY`
 * is only honoured on the local server; serverless deployments should set the
 * unprefixed `GEMINI_API_KEY`.
 */
export function readAiSettings(env = {}) {
  const apiKey = String(
    env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''
  ).trim();
  const primary = String(env.GEMINI_MODEL || '').trim();
  const fallbacks = AI_DEFAULT_MODELS.filter((model) => model !== primary);

  return {
    apiKey,
    baseUrl: String(env.GEMINI_API_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, ''),
    models: primary ? [primary, ...fallbacks] : [...AI_DEFAULT_MODELS]
  };
}

/** The non-secret payload the browser reads to decide whether AI search is on. */
export function aiStatusBody(settings) {
  return {
    ok: true,
    configured: Boolean(settings?.apiKey),
    source: 'proxy',
    model: settings?.models?.[0] || AI_DEFAULT_MODELS[0],
    models: Array.isArray(settings?.models) && settings.models.length
      ? settings.models
      : [...AI_DEFAULT_MODELS]
  };
}

/**
 * In-memory sliding-window limiter. Fine for a single dev process; on serverless
 * it only limits per warm instance, so pair it with Upstash (see api/ai-search.js)
 * or your platform's WAF for real production protection.
 */
export function createRateLimiter({
  windowMs = RATE_LIMIT_WINDOW_MS,
  max = RATE_LIMIT_MAX_REQUESTS
} = {}) {
  const hits = new Map();

  return function isRateLimited(key) {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return true;
    }
    recent.push(now);
    hits.set(key, recent);

    // Opportunistic cleanup so a long-lived instance cannot grow the map forever.
    if (hits.size > 500) {
      for (const [entryKey, times] of hits) {
        if (!times.some((time) => now - time < windowMs)) hits.delete(entryKey);
      }
    }
    return false;
  };
}

/** One Gemini call. Never throws for HTTP errors; returns a discriminated result. */
export async function callGemini({ apiKey, baseUrl, model, payload, timeoutMs = REQUEST_TIMEOUT_MS }) {
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
export function classifyGeminiFailure(result) {
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
      message: 'Gemini rejected the API key. Check the server GEMINI_API_KEY and redeploy.'
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

function errorResult(status, code, message) {
  return { status, body: { error: { code, message } } };
}

/**
 * Validate one AI search request and run it through the model fallback chain.
 *
 * @returns {Promise<{status: number, body: object}>} `body` is either
 *   `{ ok: true, text, model, usage, finishReason }` or `{ error: { code, message } }`.
 */
export async function runAiSearch({
  settings,
  query,
  catalog,
  zones = [],
  amenities = [],
  totalBudgetMs = TOTAL_BUDGET_MS,
  logger = console
}) {
  const text = typeof query === 'string' ? query.trim() : '';
  const listings = Array.isArray(catalog) ? catalog : [];

  if (!settings?.apiKey) {
    return errorResult(
      503,
      'not-configured',
      'AI search is not configured. Add GEMINI_API_KEY to the server environment and redeploy.'
    );
  }
  if (text.length < 3) {
    return errorResult(400, 'query-too-short', 'Describe what you need in a sentence first.');
  }
  if (text.length > 1200) {
    return errorResult(400, 'query-too-long', 'That message is too long. Keep it under about 1,200 characters.');
  }
  if (listings.length === 0) {
    return errorResult(422, 'empty-catalog', 'There are no listings to search yet.');
  }
  if (listings.length > AI_MAX_CATALOG * 2) {
    return errorResult(413, 'catalog-too-large', 'The listing catalog is too large for one AI request.');
  }

  const modelsToTry = (settings.models?.length ? settings.models : AI_DEFAULT_MODELS).slice(0, 4);
  const startedAt = Date.now();
  const deadline = startedAt + totalBudgetMs;
  let lastFailure = null;

  for (let index = 0; index < modelsToTry.length; index += 1) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;

    const model = modelsToTry[index];
    const attemptTimeout = Math.min(REQUEST_TIMEOUT_MS, remaining);
    let payload = buildGeminiRequest({ query: text, catalog: listings, zones, amenities, model });
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
        logger.warn?.(`[ai-search] ${model} hit the output limit (${Date.now() - startedAt}ms)`);
        return errorResult(
          502,
          'truncated',
          'The AI answer was too long to finish. Try a shorter message or fewer must-haves.'
        );
      }

      logger.log?.(
        `[ai-search] ${model} · ${text.length} chars · ${listings.length} listings · ${Date.now() - startedAt}ms`
      );
      return {
        status: 200,
        body: {
          ok: true,
          text: result.text,
          model,
          usage: result.usage,
          finishReason: result.finishReason
        }
      };
    }

    const failure = classifyGeminiFailure(result);
    lastFailure = failure;

    const redacted = String(failure.message || '').split(settings.apiKey).join('[redacted]');
    logger.warn?.(`[ai-search] ${model} failed (${failure.code || result.status}): ${redacted}`);

    if (failure.retryNextModel && index < modelsToTry.length - 1
      && deadline - Date.now() >= MIN_ATTEMPT_MS) {
      continue;
    }

    return errorResult(
      failure.status || 502,
      failure.code || 'upstream',
      redacted || 'The AI request failed.'
    );
  }

  return errorResult(
    lastFailure?.status || 504,
    lastFailure?.code || 'timeout',
    lastFailure?.message || 'Gemini took too long to answer. Please try again.'
  );
}
