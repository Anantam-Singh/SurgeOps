# SurgeOps Server

Node.js + Express 5 + Mongoose backend for SurgeOps.

```bash
cp .env.example .env    # fill in MONGO_URI
npm install
npm run seed:reset      # demo data
npm run dev             # http://localhost:5000
```

Source lives in `src/` — feature modules in `src/modules/`, the detection/ML/recommendation
engine in `src/engine/`, AI reasoning providers in `src/ai/`.

See the [project README](../README.md) for full architecture, environment variables, and API docs.
