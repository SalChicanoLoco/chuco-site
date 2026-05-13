# NewMexicoSocialists.org Extraction Plan

Date: May 13, 2026

## Goal

Avoid double-work between this repository (`collective`) and the dedicated `newmexicosocialists.org` repository by defining:

1. what to migrate,
2. what to keep as reference,
3. and what to stop doing here.

## Files to Migrate to the NMS Repo

### Primary page implementation
- `staging/newmexicosocialists/nmnewsfeed.html`

### Shared system assets (copy or subtree)
- `shared/sena-system.css`
- `shared/template-newsfeed.html`
- Optional: `shared/template-landing.html` if the NMS repo needs the same landing pattern.

### Optional worker starter
- `shared/worker-template/index.js`
- `shared/worker-template/wrangler.toml`

## Files to Keep in this Repo

- `index.html` links pointing to `https://newmexicosocialists.org` (cross-site references).
- historical notes in `README.md`.

## Files/Config to Stop Using for NMS Hosting Here

- Netlify root redirects that point this repo’s `/` to NMS staging content.

This repo should serve Colectivo pages as primary; NMS production routing should be defined in the NMS repo.

## Cutover Checklist

1. Copy files above into NMS repo.
2. Replace staged data source in NMS page with NMS-specific API/worker URL.
3. Configure Netlify in NMS repo:
   - set build publish root,
   - set canonical host behavior (apex/www),
   - set SSL and DNS records.
4. Smoke test:
   - homepage renders,
   - feed loads,
   - filters and language toggle work,
   - mobile view and footer links are valid.
5. Keep this repo as a consumer/linker only.

## Risk Notes

- If both repos manage redirects/domain behavior simultaneously, stale cache and host conflicts are likely.
- Keep one source of truth for DNS + platform settings (NMS repo).
