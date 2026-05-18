# CHUCO CGS Tank Asset Pipeline

Branch: feature/chuco-conference-v5

## Problem

The current WebGL build still draws creatures procedurally, so fish appear as glowing blobs. The tank renderer is acceptable, but creature identity must come from image textures or GLB models.

## Direction

Use this pipeline:

1. Generate consistent reference sheets for CHUCO, fish, and shrimp.
2. Clean and optimize texture assets.
3. Use textured WebGL planes as the immediate fix.
4. Use Blender Python to build low-poly proxy models and export GLB assets.
5. Keep WebGL for water, lighting, caustics, depth, and compositing.

## Required asset paths

assets/creatures/chuco-cleaner.png
assets/creatures/chuco-idle.png
assets/creatures/fish-blue.png
assets/creatures/fish-gold.png
assets/creatures/fish-cichlid.png
assets/creatures/fish-schooling.png
assets/creatures/shrimp.png
assets/environment/tank-bg.webp
assets/environment/foreground-plants.webp
assets/models/chuco-cleaner.glb
assets/models/fish-schooling.glb
assets/models/fish-cichlid.glb
assets/models/shrimp.glb

## Rules

- Do not use procedural blobs as primary creatures.
- Load creature visuals from textures or GLB models.
- Keep Cloudflare Pages compatibility.
- Keep strict CSP compatibility.
- Keep NUMARA P0-P7 HUD.
- Keep CHUCO as the algae-surfing biofilter guardian.
- Feed controls affect fish, not CHUCO.
- Biofilter controls affect CHUCO.

## First patch

Replace the procedural creature renderer in app.js with a textured WebGL quad renderer. Keep the current water shader and backend routes.
