/**
 * Integration tests for the local Gemini proxy — run with `npm run test:ai`.
 *
 * A stub Gemini server stands in for Google, so the whole request path (status
 * probe, validation, prompt body, model fallback, error mapping) is exercised
 * without a real API key or any network access.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { aiSearchProxy } from './vite-ai-proxy.js';

// These tests configure the proxy through temp .env files; clear anything the
// host machine may have exported so the results stay deterministic.
delete process.env.GEMINI_API_KEY;
delete process.env.VITE_GEMINI_API_KEY;
delete process.env.GEMINI_MODEL;
delete process.env.GEMINI_API_BASE_URL;

const STUB_ANSWER = {
  summary: 'Cheap, flood-safe solo room in San Ignacio.',
  followUp: '',
  needs: [
    { id: 'budget', label: '≤ ₱3,500', kind: 'budget', priority: 'must', filter: { maxBudget: 3500 } },
    { id: 'flood', label: 'Flood-safe', kind: 'flood', priority: 'must', filter: { floodFreeOnly: true } }
  ],
  matches: [{ id: 'p1', meets: ['budget'], unsure: ['flood'], reason: '₱3,200, audit pending' }]
};

const SEARCH_BODY = {
  query: 'Barato nga solo room duol sa San Ignacio, walay baha',
  catalog: [
    {
      id: 'p1',
      name: 'San Ignacio Pad',
      zone: 'San Ignacio',
      price: 3200,
      room: 'Solo Room',
      gender: 'Female Only',
      walk: 4,
      meters: 300,
      available: 2,
      verified: true,
      amenities: ['Inverter Aircon'],
      flood: true,
      water: true,
      power: true,
      wifi: 55,
      mobile: { globe: '5G', smart: '4G', dito: 'weak' },
      noCurfew: true,
      rules: ['No Curfew']
    }
  ],
  zones: ['San Ignacio'],
  amenities: ['Inverter Aircon']
};

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function startStubGemini() {
  const calls = [];

  const server = http.createServer((req, res) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      let body = null;
      try {
        body = JSON.parse(raw || '{}');
      } catch {
        body = null;
      }

      const prompt = body?.contents?.[0]?.parts?.[0]?.text || '';
      calls.push({ url: req.url, apiKey: req.headers['x-goog-api-key'], body, prompt });

      const send = (status, payload) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(payload));
      };

      if (prompt.includes('FAIL_500')) {
        send(500, { error: { code: 500, status: 'INTERNAL', message: 'boom' } });
        return;
      }
      if (req.url.includes('gemini-3.6-flash') && prompt.includes('MODEL_404')) {
        send(404, { error: { code: 404, status: 'NOT_FOUND', message: 'models/gemini-3.6-flash is not found' } });
        return;
      }
      if (req.url.includes('gemini-3.6-flash') && prompt.includes('OVERLOADED')) {
        send(503, {
          error: {
            code: 503,
            status: 'UNAVAILABLE',
            message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary.'
          }
        });
        return;
      }
      if (prompt.includes('BAD_KEY')) {
        send(403, { error: { code: 403, status: 'PERMISSION_DENIED', message: 'API key not valid' } });
        return;
      }
      if (prompt.includes('LONG_ANSWER')) {
        send(200, {
          candidates: [{ content: { parts: [{ text: '{"summary":"cut off mid' }] }, finishReason: 'MAX_TOKENS' }]
        });
        return;
      }

      send(200, {
        candidates: [
          {
            content: { parts: [{ text: JSON.stringify(STUB_ANSWER) }] },
            finishReason: 'STOP'
          }
        ],
        usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 60, totalTokenCount: 180 }
      });
    });
  });

  return listen(server).then((port) => ({
    port,
    calls,
    close: () => new Promise((resolve) => server.close(resolve))
  }));
}

async function startProxyApp({ apiKey = 'test-key', stubPort = null } = {}) {
  const envDir = fs.mkdtempSync(path.join(os.tmpdir(), 'balay-ai-'));
  const lines = [];
  if (apiKey) lines.push(`GEMINI_API_KEY=${apiKey}`);
  if (stubPort) lines.push(`GEMINI_API_BASE_URL=http://127.0.0.1:${stubPort}/v1beta`);
  fs.writeFileSync(path.join(envDir, '.env'), `${lines.join('\n')}\n`);

  const plugin = aiSearchProxy();
  // `loadEnv` only needs a real directory; the rest of the resolved config is
  // irrelevant to the middleware under test.
  plugin.configResolved({ mode: 'test', envDir, root: envDir, command: 'build' });

  let middleware = null;
  plugin.configureServer({ middlewares: { use(fn) { middleware = fn; } } });
  assert.equal(typeof middleware, 'function');

  const server = http.createServer((req, res) => {
    middleware(req, res, () => {
      res.statusCode = 404;
      res.end('not-found');
    });
  });

  const port = await listen(server);

  return {
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => {
      server.close(() => {
        fs.rmSync(envDir, { recursive: true, force: true });
        resolve();
      });
    })
  };
}

async function request(base, pathname, { method = 'GET', body } = {}) {
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

// ── tests ─────────────────────────────────────────────────────────────────────

test('status probe reports proxy + configured model', async () => {
  const stub = await startStubGemini();
  const app = await startProxyApp({ stubPort: stub.port });

  try {
    const { status, data } = await request(app.base, '/api/ai-status');
    assert.equal(status, 200);
    assert.equal(data.configured, true);
    assert.equal(data.source, 'proxy');
    assert.equal(data.model, 'gemini-3.6-flash');
  } finally {
    await app.close();
    await stub.close();
  }
});

test('a search forwards the prompt to Gemini and returns its text', async () => {
  const stub = await startStubGemini();
  const app = await startProxyApp({ stubPort: stub.port });

  try {
    const { status, data } = await request(app.base, '/api/ai-search', {
      method: 'POST',
      body: SEARCH_BODY
    });

    assert.equal(status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.model, 'gemini-3.6-flash');
    assert.equal(JSON.parse(data.text).summary, STUB_ANSWER.summary);

    assert.equal(stub.calls.length, 1);
    const call = stub.calls[0];
    assert.ok(call.url.includes('/models/gemini-3.6-flash:generateContent'));
    assert.equal(call.apiKey, 'test-key'); // key travels server-side only
    assert.ok(call.prompt.includes('Barato nga solo room'));
    assert.ok(call.prompt.includes('San Ignacio'));
    assert.ok(call.prompt.includes('"id":"p1"') || call.prompt.includes('"id": "p1"'));
    assert.equal(call.body.generationConfig.responseMimeType, 'application/json');
    assert.deepEqual(call.body.generationConfig.thinkingConfig, { thinkingBudget: 0 });
    assert.ok(call.body.systemInstruction.parts[0].text.includes('Balay Urios'));
  } finally {
    await app.close();
    await stub.close();
  }
});

test('the proxy rejects the wrong method and invalid payloads', async () => {
  const stub = await startStubGemini();
  const app = await startProxyApp({ stubPort: stub.port });

  try {
    const wrongMethod = await request(app.base, '/api/ai-search');
    assert.equal(wrongMethod.status, 405);
    assert.equal(wrongMethod.data.error.code, 'method-not-allowed');

    const shortQuery = await request(app.base, '/api/ai-search', {
      method: 'POST',
      body: { ...SEARCH_BODY, query: 'hi' }
    });
    assert.equal(shortQuery.status, 400);
    assert.equal(shortQuery.data.error.code, 'query-too-short');

    const noCatalog = await request(app.base, '/api/ai-search', {
      method: 'POST',
      body: { ...SEARCH_BODY, catalog: [] }
    });
    assert.equal(noCatalog.status, 422);
    assert.equal(noCatalog.data.error.code, 'empty-catalog');

    // Nothing reached Gemini for any of those.
    assert.equal(stub.calls.length, 0);
  } finally {
    await app.close();
    await stub.close();
  }
});

test('a missing key is reported as not-configured without calling Gemini', async () => {
  const stub = await startStubGemini();
  const app = await startProxyApp({ apiKey: '', stubPort: stub.port });

  try {
    const status = await request(app.base, '/api/ai-status');
    assert.equal(status.data.configured, false);

    const search = await request(app.base, '/api/ai-search', {
      method: 'POST',
      body: SEARCH_BODY
    });
    assert.equal(search.status, 503);
    assert.equal(search.data.error.code, 'not-configured');
    assert.equal(stub.calls.length, 0);
  } finally {
    await app.close();
    await stub.close();
  }
});

test('Gemini failures are mapped to clear error codes', async () => {
  const stub = await startStubGemini();
  const app = await startProxyApp({ stubPort: stub.port });

  try {
    const upstream = await request(app.base, '/api/ai-search', {
      method: 'POST',
      body: { ...SEARCH_BODY, query: 'Please FAIL_500 this request' }
    });
    assert.equal(upstream.status, 502);
    assert.equal(upstream.data.error.code, 'upstream');
    assert.equal(upstream.data.error.message, 'boom');

    const invalidKey = await request(app.base, '/api/ai-search', {
      method: 'POST',
      body: { ...SEARCH_BODY, query: 'Please BAD_KEY this request' }
    });
    assert.equal(invalidKey.status, 502);
    assert.equal(invalidKey.data.error.code, 'invalid-key');
    // The configured key must never be echoed back to the browser.
    assert.ok(!JSON.stringify(invalidKey.data).includes('test-key'));
  } finally {
    await app.close();
    await stub.close();
  }
});

test('a truncated model answer is reported instead of parsed', async () => {
  const stub = await startStubGemini();
  const app = await startProxyApp({ stubPort: stub.port });

  try {
    const { status, data } = await request(app.base, '/api/ai-search', {
      method: 'POST',
      body: { ...SEARCH_BODY, query: 'Please give me a LONG_ANSWER' }
    });

    assert.equal(status, 502);
    assert.equal(data.error.code, 'truncated');
  } finally {
    await app.close();
    await stub.close();
  }
});

test('an unavailable model falls back to the next one', async () => {
  const stub = await startStubGemini();
  const app = await startProxyApp({ stubPort: stub.port });

  try {
    const { status, data } = await request(app.base, '/api/ai-search', {
      method: 'POST',
      body: { ...SEARCH_BODY, query: 'MODEL_404 — cheap room please' }
    });

    assert.equal(status, 200);
    assert.equal(data.model, 'gemini-3.5-flash');
    assert.equal(data.ok, true);
    assert.equal(stub.calls.length, 2);
  } finally {
    await app.close();
    await stub.close();
  }
});

test('an overloaded model (503 high demand) falls back instead of failing', async () => {
  const stub = await startStubGemini();
  const app = await startProxyApp({ stubPort: stub.port });

  try {
    const { status, data } = await request(app.base, '/api/ai-search', {
      method: 'POST',
      body: { ...SEARCH_BODY, query: 'OVERLOADED — cheap room please' }
    });

    assert.equal(status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.model, 'gemini-3.5-flash');
    assert.equal(stub.calls.length, 2);
  } finally {
    await app.close();
    await stub.close();
  }
});
