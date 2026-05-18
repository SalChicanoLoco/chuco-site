# CHUCO CGS Tank Real 3D Runtime

Branch: `feature/chuco-conference-v5`

## Current execution decision

The fake creature paths are abandoned:

- no procedural blob fish
- no SVG rectangle creature hacks
- no 2D sprite overlay as final renderer

The branch now uses a real Three.js scene runtime through Vite. Three.js is resolved through npm and bundled by Vite, not loaded from a CDN.

## Cloudflare Pages settings

Use these settings for this branch:

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
Root directory: /
```

`wrangler.toml` also points `pages_build_output_dir` to `dist`.

## Runtime components

```text
src/main.js              real 3D scene runtime
functions/api/[[path]].js Cloudflare Pages Function API
public/_headers          strict CSP/security headers copied to dist
public/manifest.json     PWA manifest copied to dist
```

Scene runtime includes:

- Three.js renderer
- perspective camera
- tank glass and tank frame
- water surface shader
- water volume tint/fog
- lights and shadows
- low-poly real 3D fish meshes
- low-poly CHUCO guardian mesh
- low-poly bottom cleaner mesh
- bubbles and feed pellets
- NUMARA P0-P7 state HUD
- procedural WebAudio after user gesture

## Asset sourcing lane

Next step is to replace generated low-poly placeholder meshes with vetted free GLB assets.

Accepted sources:

- CC0 / public domain preferred
- permissive attribution licenses accepted if documented
- reject ripped game assets
- reject unclear licenses
- reject noncommercial-only assets for the deploy branch

Target paths:

```text
assets/models/fish-schooling.glb
assets/models/fish-cichlid.glb
assets/models/chuco-cleaner.glb
assets/models/shrimp.glb
assets/textures/*
ATTRIBUTION.md
```

## Behavior layer

Simple 3D steering is intentional:

- fish wander in tank volume and respond to feed
- CHUCO patrols bottom/algae/biofilter zones and ignores pellet feed
- cleaner stays near bottom/driftwood zone
- telemetry affects weights and HUD state
- NUMARA P0-P7 explains the active state transition

## Acceptance criteria

- Cloudflare preview shows real 3D model forms, not blobs or rectangles.
- At least one fish swims in 3D tank space.
- CHUCO guardian is a mesh/model placeholder at minimum.
- `/api/health` works.
- `/api/telemetry` accepts POST.
- Audio starts only after user gesture.
- No browser API keys.
- No CDN JavaScript.
- Mobile viewport remains usable.
- 65-inch display mode remains visually stable.
