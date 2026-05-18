# CHUCO CGS Tank Asset Attribution

This file tracks all third-party model, texture, audio, and UI assets used in the conference build.

## Current status

The current branch uses procedural low-poly placeholder meshes generated in `src/main.js`.

No third-party GLB/GLTF model assets have been committed yet.

## Rules for adding assets

Preferred licenses:

- CC0 / public domain
- MIT / Apache-style permissive assets
- CC-BY only when attribution is complete and included below

Rejected for deploy branch:

- unclear license
- ripped game assets
- noncommercial-only assets
- assets requiring account-only/private access without redistributable license
- paid assets unless separated from the public deploy branch

## Attribution table

| Asset path | Source | Author | License | Notes |
|---|---|---|---|---|
| `src/main.js` low-poly placeholder meshes | Generated in project code | Salvador Sena / OpenAI-assisted build | Project-owned | Temporary runtime meshes; replace with vetted GLB assets. |

## Candidate asset intake checklist

Before committing any model or texture:

1. Confirm license.
2. Save source URL.
3. Save author name or organization.
4. Convert to `.glb` if needed.
5. Optimize texture resolution.
6. Verify mobile performance.
7. Add row to this table.
8. Commit asset only after attribution is complete.
