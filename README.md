# SurgeOps — Surge Demand Detection & Inventory Rebalancing Platform

SurgeOps monitors live order flow across a network of quick-commerce fulfillment centers ("dark stores"),
detects localized demand surges in real time, and recommends inventory transfers between stores — each
recommendation driven by a trained ML demand forecast and explained in plain language by an AI reasoning layer.

📘 **New to the codebase?** Read [`docs/SurgeOps_Complete_Guide.pdf`](docs/SurgeOps_Complete_Guide.pdf) —
a beginner-friendly walkthrough of every component, with interview-style Q&A for every concept used.

## Repository layout

```
├── server/          Node.js + Express 5 + Mongoose (MongoDB) backend
│   └── src/
│       ├── modules/     feature modules (auth, areas, orders, surges, recommendations, analytics, ml, ...)
│       ├── engine/      surge detector, ML forecaster, transfer recommender, enrichers
│       ├── ai/          reasoning providers (Gemini / OpenAI / offline)
│       ├── middleware/  auth guard, error handler, request logger, hooks registry
│       └── scripts/     seed, baseline backfill
├── client/          React 19 + Vite + Tailwind CSS 4 frontend
└── docs/            project guide + report PDFs
```

| Layer | Where | What it does |
|---|---|---|
| Auth | `server/src/modules/auth`, `users` | Google/GitHub OAuth + passwordless email identity; JWT sessions; every account's data is fully isolated |
| Areas | `server/src/modules/areas` | Per-account fulfillment centers with geo, capacity, per-category stock |
| Orders | `server/src/modules/orders` | Immutable order event stream; server-side pricing from the shared catalog |
| Surge detection | `server/src/engine/detectors`, `engine/velocity.js` | Rule-based: current-window demand vs. 5-day median baseline per area × category |
| ML forecasting | `server/src/engine/ml` | Random-forest regression (pure JS) trained on order history; predicts next-window demand with confidence + feature importance |
| Recommendations | `server/src/modules/recommendations`, `engine/recommender` | Best-source transfer matching (surplus, distance, perishability) sized by the ML forecast; accepting one moves real stock |
| AI reasoning | `server/src/ai` | Gemini / OpenAI / deterministic offline provider — every recommendation always gets a grounded explanation |
| Enrichment | `server/src/engine/enrichers` | Weather + festival demand multipliers, cron-scheduled recalibration |
| Analytics | `server/src/modules/analytics` | Live area-demand and velocity-curve aggregates for the dashboard |

### The pipeline

1. An order is posted (`POST /api/orders`) → priced server-side, persisted.
2. An `order.created` hook runs surge detection for that order's categories.
3. If demand crosses the configured threshold vs. baseline, a `SurgeAlert` opens (and stale alerts auto-resolve when demand subsides).
4. A `surge.detected` hook auto-generates a recommendation: snapshot deficit vs. ML-predicted next-window demand → best transfer source → AI rationale.
5. Accepting a recommendation (`PATCH /api/recommendations/:id/status`) atomically shifts capacity **and** category stock between the two stores.

## Setup

Requirements: Node.js ≥ 18, a MongoDB connection string (Atlas free tier works).

```bash
# 1. Backend
cd server
cp .env.example .env        # then fill in MONGO_URI (and optionally OAuth keys — see below)
npm install
npm run seed:reset          # demo data: 3 areas, 6 products, 5 days of order history
npm run dev                 # http://localhost:5000

# 2. Frontend (separate terminal)
cd client
npm install
npm run dev                 # http://localhost:3000
```

Sign in with **demo@surgeops.local** (passwordless) to see the seeded demo network,
or any other email / Google / GitHub to start a fresh, empty account.

### New accounts and surge detection

Surge detection compares current demand against several days of history. A brand-new account has none,
so detection stays silent no matter how many orders you inject. Backfill a realistic baseline first:

```bash
cd server
npm run backfill-baseline -- --email=you@example.com
```

### Environment variables (`server/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Signs session tokens (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `AI_PROVIDER` | no | `offline` (default, no key needed), `gemini`, or `openai` — falls back to offline automatically on failure |
| `GEMINI_KEY` / `OPENAI_KEY` | no | Only if using a real LLM provider |
| `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET` | no | Enable OAuth sign-in buttons |
| `CLIENT_URL`, `SERVER_BASE_URL` | no | Frontend origin / backend public URL (default localhost:3000 / :5000) |
| `OPENWEATHER_API_KEY` | no | Live weather enrichment |
| `RECALIBRATION_CRON` | no | Cron cadence for enrichment + ML retraining (default every 30 min) |

Frontend: `client/.env` → `VITE_API_BASE_URL=http://localhost:5000`.

## API surface

All routes except `/api/auth/*`, `/api/health`, and product reads require `Authorization: Bearer <jwt>`.

```
POST  /api/auth/email               passwordless login { email }
GET   /api/auth/google|github       OAuth flows (redirect back with ?token=)
GET   /api/auth/me                  current identity

GET/POST/PATCH /api/areas           your fulfillment centers
GET/POST       /api/orders          order feed / ingestion (triggers detection)
GET   /api/surges?status=open       surge alerts   POST /api/surges/detect  manual sweep
GET   /api/recommendations          transfer recommendations
PATCH /api/recommendations/:id/status   accepted | rejected | executed
GET   /api/analytics/area-demand    live per-area×category demand vs baseline
GET   /api/analytics/velocity-curve?areaId=   hourly demand time series
GET   /api/ml/status                model state   POST /api/ml/train  manual retrain
```

## Known limitations

- Email login is passwordless: each address is a distinct isolated account, but ownership of the address is not verified. Use OAuth for verified identity.
- The ML model trains globally across accounts (patterns only — no account's raw numbers are exposed to another).
- The product catalog is shared across accounts (reads public, mutations require auth).
- ML training is synchronous on the Node event loop; it is deliberately capped (~400 sampled rows, 30 trees) to stay ~1s per run.

## License

[MIT](LICENSE)
