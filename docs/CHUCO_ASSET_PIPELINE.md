# CHUCO CGS Tank Asset Pipeline

Branch: `feature/chuco-conference-v5`

## Current truth

Earlier renderer attempts used procedural WebGL silhouettes and then SVG/textured-quad experiments. Those paths produced blobs or rectangle-like artifacts and are no longer the production direction.

The branch now uses a Vite + Three.js real 3D scene runtime. Current fish, CHUCO, and cleaner creatures are low-poly placeholder meshes generated in code. They are temporary but real 3D forms.

## Target direction

Use this pipeline:

```text
licensed/free model candidate
-> license gate
-> triangle/texture inspection
-> GLB normalization
-> attribution ledger
-> runtime registry
-> Cloudflare preview QA
```

Image generation should be used for:

- UI skins;
- app panel graphics;
- icon sheets;
- texture references;
- orthographic concept sheets for Blender work.

Image generation should not be used as a substitute for real 3D geometry in the production creature path.

## Required future asset paths

```text
assets/models/chuco-cleaner.glb
assets/models/fish-schooling.glb
assets/models/fish-cichlid.glb
assets/models/shrimp.glb
assets/models/plants.glb
assets/models/driftwood.glb
assets/textures/*
```

## Current placeholder status

The current placeholders are defined in `src/main.js`:

- fish mesh factory;
- CHUCO guardian mesh factory;
- cleaner species mesh factory;
- rocks/plants/driftwood procedural environment.

These are allowed only until vetted GLB assets are available.

## Asset intake rules

Every third-party asset must pass:

1. license verification;
2. source URL capture;
3. author capture;
4. GPL-compatibility review;
5. triangle count inspection;
6. texture size inspection;
7. GLB conversion/normalization if needed;
8. scale/orientation normalization;
9. `ATTRIBUTION.md` update;
10. Airtable `CHUCO_MODEL_GRAPH` update.

## License gate

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

## Performance gate

See `docs/WEBGL_PERFORMANCE_BUDGET.md`.

The short rule:

```text
low-poly meshes + strong materials/textures + simple behavior + capped particles
```

Do not solve visual quality by adding heavy geometry, excessive transparency, post-processing chains, or unbounded particles.

## Runtime integration plan

1. Add model registry in `src/main.js`.
2. Use `GLTFLoader` for candidate `.glb` files.
3. Cache loaded models.
4. Normalize scale/orientation per species.
5. Keep procedural mesh fallback if a model fails to load.
6. Use shared materials/instancing where possible for fish schools.
7. Run Cloudflare preview QA before marking a model accepted.

## Acceptance criteria

A model patch is accepted only if:

- it does not introduce blobs or rectangle sprites;
- it loads in Cloudflare preview;
- it does not break mobile viewport;
- it does not introduce browser secrets or CDN JS;
- it has attribution and license evidence;
- it stays within the WebGL performance budget;
- CHUCO remains algae/biofilter guardian, not fish-feed behavior.
