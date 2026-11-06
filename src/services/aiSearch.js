/**
 * Balay Urios — AI Student-Needs Search: browser service.
 *
 * Talks to the local Gemini proxy (`/api/ai-search`, see scripts/vite-ai-proxy.js)
 * so the API key never enters the bundle. If no proxy is reachable — a static
 * deploy without serverless functions — it can fall back to a key exposed as
 * `VITE_GEMINI_API_KEY`, but that path is opt-in and logged as unsafe.
 *
 * Everything the model returns is normalised and validated against the live
 * catalog by `normalizeAiResult`, so a bad or hallucinated answer degrades to
 * "no match" instead of rendering an invented listing.
 */

import {
  AI_DEFAULT_MODELS,
  AI_MAX_QUERY_LENGTH,
  buildCatalog,
  buildGeminiRequest,
  normalizeAiResult,
  parseAiJson
} from './ai/aiNeeds.js';

const PROXY_STATUS_URL = '/api/ai-status';
const PROXY_SEARCH_URL = '/api/ai-search';
const DIRECT_BASE_URL = String(
  import.meta.env.VITE_GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'
).replace(/\/+$/, '');
const DIRECT_API_KEY = String(import.meta.env.VITE_GEMINI_API_KEY || '').trim();
const DIRECT_MODEL = String(import.meta.env.VITE_GEMINI_MODEL || AI_DEFAULT_MODELS[0]).trim();

// The proxy can spend up to ~90s across model fallbacks (TOTAL_BUDGET_MS);
// give it a little more than that before the browser gives up.
const PROXY_TIMEOUT_MS = 100_000;
const DIRECT_TIMEOUT_MS = 60_000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_PREFIX = 'balay-urios:ai-needs:v1:';

let directKeyWarned = false;

/** Typed error so the UI can show a specific, actionable message. */
export class AiSearchError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'AiSearchError';
    this.code = code;
    this.details = details;
  }
}

// ── status detection ──────────────────────────────────────────────────────────

let statusPromise = null;

/**
 * Resolves once: is AI search usable, and through which route?
 * `{ configured, source: 'proxy' | 'direct' | 'none', model, models, proxySeen }`
 */
export function getAiStatus() {
  if (!statusPromise) statusPromise = detectStatus();
  return statusPromise;
}

async function detectStatus() {
  let proxy = null;

  try {
    const response = await fetch(PROXY_STATUS_URL, {
      headers: { accept: 'application/json' },
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (data && typeof data.configured === 'boolean') {
        proxy = {
          configured: data.configured,
          source: 'proxy',
          model: data.model || AI_DEFAULT_MODELS[0],
          models: Array.isArray(data.models) && data.models.length ? data.models : AI_DEFAULT_MODELS,
          proxySeen: true
        };
      }
    }
  } catch {
    proxy = null;
  }

  if (proxy && proxy.configured) return proxy;

  if (DIRECT_API_KEY) {
    if (!directKeyWarned) {
      directKeyWarned = true;
      console.warn(
        '[ai-search] Using VITE_GEMINI_API_KEY in the browser. This key ships inside the bundle — '
        + 'restrict it to your domain or use the local/serverless proxy instead.'
      );
    }
    return {
      configured: true,
      source: 'direct',
      model: DIRECT_MODEL,
      models: [DIRECT_MODEL],
      proxySeen: Boolean(proxy)
    };
  }

  return {
    configured: false,
    source: 'none',
    model: '',
    models: [],
    proxySeen: Boolean(proxy)
  };
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function requestJson(url, options = {}, timeoutMs = PROXY_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AiSearchError(
        'timeout',
        'The AI took too long to answer. Check your connection and try again.'
      );
    }
    throw new AiSearchError(
      'network',
      'We could not reach the AI service. Check your connection and try again.',
      error
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => null);
  return { response, data };
}

function mapHttpFailure(status, data, fallbackMessage) {
  const code = data?.error?.code;
  const message = data?.error?.message || fallbackMessage;

  if (status === 429) {
    return new AiSearchError('rate-limited', message || 'The AI is busy right now. Try again in a minute.');
  }
  if (code === 'overloaded') {
    return new AiSearchError('rate-limited', message || 'The AI is busy right now. Try again in a minute.');
  }
  if (code === 'not-configured') return new AiSearchError('not-configured', message);
  if (code === 'invalid-key') return new AiSearchError('invalid-key', message);
  if (status === 401 || status === 403
    || /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)) {
    return new AiSearchError('invalid-key', message || 'Gemini rejected the API key.');
  }
  if (code === 'query-too-short' || code === 'query-too-long') return new AiSearchError(code, message);
  if (code === 'empty-catalog') return new AiSearchError('empty-catalog', message);
  if (code === 'blocked') return new AiSearchError('blocked', message);
  if (code === 'truncated') return new AiSearchError('truncated', message);
  if (status === 504) return new AiSearchError('timeout', message);
  if (status >= 400 && status < 500) return new AiSearchError('bad-request', message);
  return new AiSearchError('upstream', message || 'The AI request failed.');
}

// ── cache ─────────────────────────────────────────────────────────────────────

function hashString(input) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function cacheKeyFor(query, catalog) {
  const fingerprint = JSON.stringify({
    q: query.trim().toLowerCase(),
    listings: catalog.map((listing) => [
      listing.id,
      listing.price,
      listing.available,
      listing.walk,
      listing.amenities.length
    ])
  });
  return `${CACHE_PREFIX}${hashString(fingerprint)}`;
}

function readCache(key) {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.at !== 'number') return null;
    if (Date.now() - entry.at > CACHE_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return entry.result || null;
  } catch {
    return null;
  }
}

function writeCache(key, result) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), result }));
  } catch {
    // Storage may be disabled (private mode / quota) — caching is optional.
  }
}

// ── the two transports ────────────────────────────────────────────────────────

async function requestViaProxy({ query, catalog, zones, amenities }) {
  const { response, data } = await requestJson(
    PROXY_SEARCH_URL,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ query, catalog, zones, amenities })
    },
    PROXY_TIMEOUT_MS
  );

  if (!response.ok) {
    throw mapHttpFailure(response.status, data, 'The AI proxy could not answer.');
  }
  if (!data?.text) {
    throw new AiSearchError('upstream', 'The AI returned an empty answer. Try rephrasing.');
  }

  return { text: data.text, model: data.model || '' };
}

function classifyDirectFailure(status, data) {
  const message = data?.error?.message || `Gemini responded with HTTP ${status}.`;
  const isModelProblem = status === 404
    || (status === 400 && /model|not found|not supported/i.test(message));

  return { message, isModelProblem, status };
}

async function requestViaGeminiDirect({ query, catalog, zones, amenities }) {
  const models = [DIRECT_MODEL, ...AI_DEFAULT_MODELS.filter((model) => model !== DIRECT_MODEL)];
  let lastError = null;

  for (const model of models) {
    const payload = buildGeminiRequest({ query, catalog, zones, amenities, model });

    const { response, data } = await requestJson(
      `${DIRECT_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': DIRECT_API_KEY
        },
        body: JSON.stringify(payload)
      },
      DIRECT_TIMEOUT_MS
    );

    if (response.ok) {
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .join('')
        .trim();

      if (!text) throw new AiSearchError('blocked', 'The AI returned an empty answer. Try rephrasing.');
      return { text, model };
    }

    const failure = classifyDirectFailure(response.status, data);
    if (failure.isModelProblem) {
      lastError = new AiSearchError('model-unavailable', failure.message);
      continue;
    }
    throw mapHttpFailure(response.status, data, failure.message);
  }

  throw lastError
    || new AiSearchError('upstream', 'No Gemini model could answer this request.');
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Turn one free-text sentence into a list of validated needs plus per-listing
 * verdicts. Results are cached per query + catalog snapshot for 30 minutes so
 * toggling needs and reopening the panel is instant and free.
 */
export async function listStudentNeeds({ query, properties, force = false }) {
  const text = String(query || '').trim();

  if (text.length < 3) {
    throw new AiSearchError('query-too-short', 'Describe what you need in a sentence first.');
  }
  if (text.length > AI_MAX_QUERY_LENGTH) {
    throw new AiSearchError('query-too-long', 'Keep it under about 1,200 characters.');
  }

  const status = await getAiStatus();
  if (!status.configured) {
    throw new AiSearchError(
      'not-configured',
      'AI search is not set up yet. Add your Gemini API key to .env and restart.'
    );
  }

  const context = buildCatalog(properties);
  if (context.catalog.length === 0) {
    throw new AiSearchError('empty-catalog', 'There are no listings to search yet.');
  }

  const key = cacheKeyFor(text, context.catalog);
  if (!force) {
    const cached = readCache(key);
    if (cached) return { ...cached, cached: true };
  }

  const request = {
    query: text,
    catalog: context.catalog,
    zones: context.zones,
    amenities: context.amenities
  };

  const raw = status.source === 'proxy'
    ? await requestViaProxy(request)
    : await requestViaGeminiDirect(request);

  let parsed;
  try {
    parsed = parseAiJson(raw.text);
  } catch (error) {
    throw new AiSearchError(
      'invalid-json',
      'The AI answer arrived in an unreadable format. Please try again.',
      error
    );
  }

  const result = normalizeAiResult(parsed, context);
  result.model = raw.model;
  result.source = status.source;
  result.requestedAt = Date.now();
  result.cached = false;

  if (result.needs.length === 0) {
    throw new AiSearchError(
      'no-needs',
      'We could not find a housing need in that message. Try naming a budget, a zone, or a must-have.'
    );
  }

  writeCache(key, result);
  return result;
}
