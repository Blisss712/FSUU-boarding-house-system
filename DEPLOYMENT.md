# Deploying Balay Urios

This project is a **Vite + React SPA** with **Supabase** for auth, data, storage
and realtime, plus a small **Gemini proxy**. It is pre-wired for **Vercel**:

- `api/ai-status.js` and `api/ai-search.js` — serverless functions (the key never
  reaches the browser)
- `vercel.json` — build settings, function timeouts, SPA fallback, security headers
- `.github/workflows/ci.yml` — lint, AI tests and production build on every PR
- `src/services/ai/aiServer.js` — shared proxy core used by both the local Vite
  middleware and the serverless functions

Free tiers on Vercel and Supabase **do not require a debit card**. You do need an
account on each (sign-up is email/GitHub based).

---

## 1 — Supabase (database, auth, storage, realtime)

Create a project at <https://supabase.com>. Then, in **SQL Editor**, run the
schema files from `supabase/` in this order:

1. `full-setup.sql` — tables + RLS
2. `add-map-coordinates.sql`
3. `add-social-links.sql`
4. `add-tenancy-approval.sql`
5. `add-landlord-valid-id.sql`
6. `add-messaging.sql`

`fix-*.sql` files are patches for older installs; run one only if you hit the
problem it fixes. `clean-demo-data.sql` is optional and destructive.

Then:

- **Storage** → create a **private** bucket named `landlord-ids` (the ID upload
  code and the policies in `add-landlord-valid-id.sql` expect this name).
- **Authentication → URL Configuration**
  - Site URL: `https://<your-project>.vercel.app` (or your custom domain)
  - Redirect URLs: add the same URL and `http://localhost:5173` for local dev
- **Authentication → Providers**: enable Email (and Google/GitHub if you want).
- **Database → Publications**: confirm `messages`, `conversations` and
  `conversation_members` are in `supabase_realtime` (step 6 does this).

Copy from **Project Settings → API**:

- Project URL → `VITE_SUPABASE_URL`
- `anon` / publishable key → `VITE_SUPABASE_ANON_KEY`
- `service_role` key → **keep local only** (scripts). Never put it in Vercel.

---

## 2 — Gemini key

Create a key at <https://aistudio.google.com> → **Get API key**.

This becomes the **server-only** `GEMINI_API_KEY` in Vercel. Do not use a
`VITE_`-prefixed key in production; those are compiled into the browser bundle.

---

## 3 — Vercel

1. Push this repo to GitHub (already done).
2. Go to <https://vercel.com/new> → **Import Git Repository** → select the repo.
3. Framework preset: **Vite** (auto-detected). Build `npm run build`, output `dist`.
4. Add **Environment Variables**:

| Name | Scope | Value |
|---|---|---|
| `VITE_SUPABASE_URL` | Build + Runtime | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Build + Runtime | Supabase anon key |
| `GEMINI_API_KEY` | **Server only** | Google AI Studio key |
| `GEMINI_MODEL` | Server only (optional) | `gemini-3.6-flash` |
| `AI_ALLOWED_ORIGIN` | Server only (optional) | `https://your-domain.com` |

5. **Deploy**.

> Every time you change a `VITE_*` variable you must trigger a **new build** —
> they are inlined at build time. `GEMINI_API_KEY` only needs a redeploy/restart.

### CLI alternative

```powershell
npm i -g vercel
vercel login
vercel link
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add GEMINI_API_KEY production
vercel --prod
```

---

## 4 — Durable rate limiting (recommended)

`api/ai-search.js` falls back to an in-memory limiter, which only limits a single
warm serverless instance. For real protection create a free Upstash Redis
database (<https://upstash.com>, no card) and add:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

The function then enforces 12 searches/minute per client across all instances.

---

## 5 — Post-deploy checks

- `GET https://<domain>/api/ai-status` → `{ "configured": true, ... }`
- Run an AI needs search in the app.
- Sign up / sign in; check the Auth redirect lands on your domain.
- Open the chat between a landlord and a student (realtime).
- Upload a landlord ID (storage bucket + policies).
- Check the Vercel function logs for `[ai-search] <model> · … ms`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| AI panel says "not configured" | `GEMINI_API_KEY` missing/wrong scope in Vercel → redeploy |
| AI times out (~60s) | Function `maxDuration` hit. Lower `AI_MAX_CATALOG` in `src/services/ai/aiNeeds.js`, or move the proxy to an always-on host |
| Login redirects to localhost | Supabase **Site URL** still points at localhost |
| Chat list empty / inserts denied | Re-run `add-messaging.sql` (it restores RLS + realtime) |
| ID upload fails | `landlord-ids` bucket missing or policies not applied |
| `VITE_*` value not updating | Variables are build-time; trigger a new deployment |

---

## Security checklist

- [ ] Rotated the Gemini key that was previously in `.env.example`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` exists only locally / in CI secrets
- [ ] `VITE_GEMINI_API_KEY` is **not** set in production
- [ ] RLS policies reviewed (no `USING (true)` on tenant data)
- [ ] `AI_ALLOWED_ORIGIN` set so the AI endpoint is not a public proxy
- [ ] Supabase backups/PITR enabled on a paid plan
- [ ] Custom domain + HTTPS active
