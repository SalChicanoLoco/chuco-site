# CHUCO CGS Tank

Conference branch: `feature/chuco-conference-v5`

## What this branch is

CHUCO CGS Tank is a mobile-first WebGL aquaponics tank demo for the CGS greenhouse concept and #OpenAIDevDay2026 presentation work.

The current branch has pivoted from earlier Canvas2D/raw WebGL experiments into a Vite + Three.js runtime.

## Current implementation status

Implemented now:

- Vite build pipeline.
- Three.js 3D scene runtime.
- WebGL tank scene with glass, water surface, water volume tint, lighting, rocks, plants, driftwood, bubbles, and feed pellets.
- Low-poly procedural placeholder meshes for fish, CHUCO, and a bottom cleaner species.
- Simple 3D behavior steering:
  - fish wander in tank volume and respond to feed pellets;
  - CHUCO patrols the bottom/algae/biofilter zone and does not eat fish pellets;
  - cleaner species remains near bottom/driftwood zones.
- NUMARA P0-P7 HUD trace.
- Procedural WebAudio after user gesture.
- Cloudflare Pages Functions under `functions/api/[[path]].js`.
- Strict CSP/security headers via `public/_headers`.
- Asset attribution ledger via `ATTRIBUTION.md`.
- WebGL performance budget via `docs/WEBGL_PERFORMANCE_BUDGET.md`.

Not implemented yet:

- Final downloaded or Blender-authored GLB models.
- Final CHUCO sculpt/model.
- Final species-specific animation rigs.
- Final model optimization pass.
- Full browser/device QA report from Cloudflare preview.
- Full GPL license text file. Package metadata currently declares `GPL-3.0-or-later`; dedicated license file still needs to be added.

## What this branch is not

This branch is not yet a final production game.

The current fish and CHUCO geometry are real 3D placeholder meshes, not final art assets. They exist so the renderer, camera, water, lighting, behavior, and deployment pipeline can be tested before committing third-party or Blender-generated model assets.

## Cloudflare Pages deployment

Recommended settings:

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
Root directory: /
```

`wrangler.toml` is set to:

```text
pages_build_output_dir = "dist"
```

## Local commands

```bash
npm install
npm run check
npm run build
npm run preview
```

## API routes

Cloudflare Pages Function:

```text
functions/api/[[path]].js
```

Routes:

```text
GET  /api/health
POST /api/session
POST /api/telemetry
POST /api/generate-style
```

`/api/generate-style` should return a safe fallback if `OPENAI_API_KEY` is not configured as a Cloudflare secret.

## Model acquisition lane

Model acquisition is governed by the Airtable sandbox graph table:

```text
Base: NUMARA - Session State
Table: CHUCO_MODEL_GRAPH
```

Graph nodes currently cover:

- root decision spine;
- license gate;
- WebGL performance budget;
- asset intake;
- GLTF runtime;
- behavior layer;
- QA acceptance.

Model assets must not be committed unless they pass the license and performance gates and are listed in `ATTRIBUTION.md`.

## Asset rules

Preferred:

- CC0 / public domain;
- project-owned/generated assets;
- GPL-compatible permissive assets with attribution where required.

Rejected for public deploy branch:

- unclear license;
- ripped game assets;
- noncommercial-only assets;
- no-derivatives assets;
- paid/private assets without redistribution rights;
- assets that cannot be attributed.

## Runtime standards

- No blob fish.
- No rectangle sprite creature hacks as the production path.
- No CDN JavaScript.
- No browser API keys.
- Mobile-first performance.
- Simple behavior physics, not heavy simulation.
- CHUCO remains an algae-surfing biofilter guardian, not a pellet-eating fish.

## Next work

1. Verify the Vite build on Cloudflare Pages.
2. Confirm `/api/health` and telemetry routes still work after the build pipeline change.
3. Add model registry and GLTFLoader-based asset loading.
4. Source or generate model candidates.
5. Optimize models and update `ATTRIBUTION.md`.
6. Replace placeholder meshes only after the model passes license and performance gates.
