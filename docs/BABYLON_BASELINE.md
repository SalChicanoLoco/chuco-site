# CHUCO Babylon Baseline

This is the boring baseline for the CHUCO CGS Tank demo.

## Goal

Keep the deploy path stable before any more visual/model work.

## Active runtime

```text
index.html -> /src/engine-babylon.js -> Vite bundle -> dist
```

## Required Cloudflare Pages settings

```text
Build command: npm run build
Output directory: dist
Root directory: /
```

`wrangler.toml` must keep:

```toml
pages_build_output_dir = "dist"
```

## Required local checks

```bash
npm install
npm run check
npm run build
```

## Runtime proof

The visible badge must change from:

```text
BABYLON BOOT
```

to:

```text
BABYLON ENGINE
```

## Controls to preserve

- Feed: visible pellets, fish target change, ammonia increase.
- O2 Pulse: visible bubbles, oxygen increase, water glow change.
- Shade: lower light, lower temperature.
- Biofilter: Chuco target change, ammonia reduction.
- Scan: NUMARA state trace.
- Species: rebuild active fish mesh/material set.

## Do not reintroduce

- hand-rolled WebGL as active runtime;
- overlay creature renderer;
- stale `/src/main.js` entrypoint;
- unbundled `three` imports;
- `GLTFLoader` in this baseline;
- backend dependency for initial boot.

## Next allowed changes

1. Module split.
2. Bundle optimization.
3. Browser smoke probe.
4. Mesh/particle budget checks.
5. Only then visual/model improvement.
