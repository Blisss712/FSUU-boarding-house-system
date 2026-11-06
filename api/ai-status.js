/**
 * Vercel serverless function — AI search status probe.
 *
 * The browser calls `GET /api/ai-status` to decide whether to show the AI entry
 * points. This returns no secrets, only whether a key is present and which models
 * are configured.
 */

import { aiStatusBody, readAiSettings } from '../src/services/ai/aiServer.js';

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('allow', 'GET, HEAD');
    res.status(405).json({ error: { code: 'method-not-allowed', message: 'Use GET for /api/ai-status.' } });
    return;
  }

  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.status(200).json(aiStatusBody(readAiSettings(process.env)));
}
