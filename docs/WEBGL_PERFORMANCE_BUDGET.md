# CHUCO CGS Tank WebGL Performance Budget

Branch: `feature/chuco-conference-v5`

## Purpose

This document defines the performance and asset standards for the CHUCO model acquisition and creation lane.

The goal is a mobile-first WebGL aquarium that can still scale to a 65-inch conference display.

## Non-negotiables

- No blob creatures.
- No rectangle sprite hacks as the production path.
- Real 3D meshes for fish, CHUCO, and cleaner species.
- WebGL must remain fast on mobile.
- Cloudflare Pages deployment must stay simple.
- No CDN JavaScript.
- No browser API keys.
- Third-party assets require complete attribution.

## Runtime target

```text
Vite + Three.js
Cloudflare Pages
Cloudflare Pages Functions
GLB/GLTF model loading
Simple behavior graph
Procedural WebAudio after user gesture
```

## Performance targets

| Target | Budget |
|---|---:|
| Mid-tier mobile | 30 FPS minimum |
| Desktop/laptop | 60 FPS target |
| Conference display | 60 FPS target where GPU allows |
| Initial JS bundle | keep minimal; no framework bloat |
| Texture budget mobile | 512-1024 px per creature texture |
| Texture budget desktop | up to 2048 px for hero/background assets |
| Fish mesh | <= 1,000 triangles each preferred |
| CHUCO mesh | <= 3,000 triangles preferred |
| Cleaner/shrimp mesh | <= 1,500 triangles preferred |
| Active fish count mobile | 4-8 |
| Active fish count desktop | 8-16 |
| Bubble particles mobile | <= 80 live particles |
| Bubble particles desktop | <= 180 live particles |
| Draw calls target | keep under 80 mobile; under 160 desktop |

## Rendering rules

- Use GLB binary assets when possible.
- Use shared materials for schools of fish.
- Use InstancedMesh for repeated fish once models stabilize.
- Use baked textures and simple PBR materials instead of heavy real-time effects.
- Avoid multiple transparent full-screen layers.
- Avoid high-resolution alpha planes except for fins/gills/plants.
- Cap renderer pixel ratio:
  - battery/mobile: 1.0
  - balanced: 1.25
  - conference/desktop: 1.5-1.75
- Shadows should be optional and low-resolution.
- Water shader must be lightweight.
- Avoid post-processing chains until baseline FPS is proven.

## Model intake pipeline

Every model candidate must pass this gate before commit:

```text
1. License verified.
2. Source URL saved.
3. Author saved.
4. License compatible with GPL-3.0-or-later project distribution.
5. Model format confirmed or converted to GLB.
6. Texture size inspected.
7. Triangle count inspected.
8. Scale normalized to tank units.
9. Axis/orientation normalized.
10. Attribution added to ATTRIBUTION.md.
11. Airtable CHUCO_MODEL_GRAPH node updated.
```

## Preferred asset licenses

Preferred:

- CC0 / public domain
- Project-owned/generated assets
- GPL-compatible permissive assets with attribution where required

Reject for public deploy:

- noncommercial-only
- no-derivatives
- unclear license
- ripped game assets
- paid/private assets without redistribution rights
- assets that cannot be attributed

## Behavior budget

Use simple steering, not heavy physics.

Fish:

```text
wander + separation + boundary avoidance + feed attraction
```

CHUCO:

```text
bottom patrol + algae/biofilter target + ignores fish pellets
```

Cleaner/shrimp:

```text
bottom/driftwood zone + low speed + small local wander
```

Telemetry:

```text
temp / pH / O2 / ammonia change behavior weights and UI state; no expensive simulation
```

## Quality modes

Battery:

```text
pixel ratio 1.0
fish count low
particles low
shadows off
simple water
```

Balanced:

```text
pixel ratio 1.25
medium fish count
particles medium
simple shadows
```

Conference:

```text
pixel ratio 1.5-1.75
fish count higher
particles higher
shadows on if FPS holds
larger UI stage
```

## QA checklist

Before marking the branch conference-ready:

```text
npm install
npm run check
npm run build
```

Then verify:

```text
/ loads in Cloudflare preview
/api/health returns ok
/api/telemetry accepts POST
/api/generate-style returns fallback without OPENAI_API_KEY
no console fatal errors
no browser secrets
no CDN JS
no blobs or rectangle creatures
mobile viewport usable
65-inch display stable
WebAudio begins only after user gesture
all assets listed in ATTRIBUTION.md
```
