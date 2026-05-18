# CHUCO CGS Tank - Conference Deploy

Branch: `feature/chuco-conference-v5`

## Current runtime

This branch now uses a real Vite + Three.js 3D runtime.

Do not deploy it as a no-build static folder anymore.

## Cloudflare Pages

Use this branch as the preview/deploy branch.

Recommended settings:

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
Root directory: /
```

`wrangler.toml` also sets:

```text
pages_build_output_dir = "dist"
```

## Cloudflare Pages Functions

Endpoint file:

```text
functions/api/[[path]].js
```

Available routes:

```text
GET  /api/health
POST /api/session
POST /api/telemetry
POST /api/generate-style
```

## Optional OpenAI Image/Style Generation

Do not put API keys in browser JavaScript. Add this as a Cloudflare secret only if live style generation is needed:

```bash
wrangler secret put OPENAI_API_KEY
```

Without the secret, `/api/generate-style` returns a safe fallback style packet.

## Required local checks

```bash
npm install
npm run check
npm run build
```

If Wrangler is available:

```bash
npx wrangler pages dev dist --compatibility-date=2025-12-01
```

Then test:

```text
/
/api/health
/api/session
/api/telemetry
/api/generate-style
```

## Conference runtime notes

- WebGL is required.
- Runtime uses Three.js bundled by Vite, not CDN JavaScript.
- WebAudio starts only after user interaction.
- CSP is strict and copied from `public/_headers` into `dist`.
- NUMARA P0-P7 HUD trace is preserved.
- CHUCO role remains algae-surfing biofilter guardian.
- The current 3D creatures are low-poly runtime placeholders. Next lane is vetted GLB model replacement with `ATTRIBUTION.md`.
