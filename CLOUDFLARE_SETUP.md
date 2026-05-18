# Cloudflare Pages setup (CHUCO conference branch)

Use **Cloudflare Pages** (not standalone Worker) for this branch.

## Required Pages settings
- Framework preset: `None`
- Build command: `none`
- Output directory: `/`
- Root directory: `/`
- Production branch: `feature/chuco-conference-v5`

## Functions routing
- `functions/api/[[path]].js` handles `/api/*`.
- `_routes.json` keeps static assets static-first and only sends `/api/*` to Functions.

## Expected API routes
- `GET /api/health`
- `POST /api/session`
- `POST /api/telemetry`
- `POST /api/generate-style`

## Secrets
- `OPENAI_API_KEY` is **optional**.
- If missing, `/api/generate-style` returns a safe fallback style payload.

## Local checks
```bash
node --check app.js
node --check 'functions/api/[[path]].js'
```

If Wrangler is available:
```bash
npx wrangler pages dev . --compatibility-date=2025-12-01
```
