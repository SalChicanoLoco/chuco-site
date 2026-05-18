# CHUCO CGS Tank — Conference Deploy

Branch: `feature/chuco-conference-v5`

## Cloudflare Pages

Use this branch as the preview/deploy branch.

Recommended settings:

```text
Framework preset: None
Build command: none
Output directory: /
Root directory: /
```

Cloudflare Pages Functions endpoint:

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

Do not put API keys in browser JavaScript. Add this as a Cloudflare secret:

```bash
wrangler secret put OPENAI_API_KEY
```

Without the secret, `/api/generate-style` returns a safe fallback style packet.

## Conference Runtime Notes

- WebGL is required.
- WebAudio starts only after user interaction.
- CSP is strict and defined in `_headers`.
- NUMARA P0-P7 HUD trace is preserved.
- CHUCO role remains algae-surfing biofilter guardian.
- Tested locally with `node --check app.js` and `node --check functions/api/[[path]].js`.
