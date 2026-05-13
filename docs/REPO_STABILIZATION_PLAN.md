# Repository Stabilization Plan (May 12, 2026)

This plan scopes the next cleanup wave across the repo, with priority on greenhouse materials, calculators, and deployment readiness.

## Phase 1 — Greenhouse System (Immediate)

### 1. Secure calculator parity and correctness
- [x] Restore core calculator interactions (stats, SVG rendering, exports).
- [x] Connect option toggles to rendered blueprint and BOM output.
- [ ] Add assumption panel (cost model, yield model, climate caveats).
- [ ] Add input guardrails and human-readable warnings for unrealistic combinations.
- [ ] Add deterministic snapshot tests for core formulas.

### 2. Content/writeup consistency (CGS/SIC)
- [ ] Normalize terminology across:
  - `commons-greenhouse-calculator/`
  - `commons-greenhouse-calculator-secure/`
  - related Biblioteca volumes and notes
- [ ] Add bilingual section parity audit (EN/ES side-by-side completeness).
- [ ] Mark conceptual guidance vs. field-tested guidance explicitly.
- [ ] Add a single canonical “minimum safe spec” section for wind anchoring.

### 3. Publication and UX
- [ ] Add version/date stamp panel to greenhouse pages.
- [ ] Add downloadable “build packet” JSON + SVG + quickstart text bundle.
- [ ] Ensure print/PDF styles are legible and include all notes.

## Phase 2 — Worker/API hardening

### 1. Biblioteca worker
- [ ] Move hard-coded Airtable pipeline IDs into environment variables.
- [ ] Add pagination handling for pipeline endpoint.
- [ ] Add explicit schema whitelist for `tasks` keys.

### 2. Voice worker
- [ ] Add explicit error-class mapping for upstream 4xx/5xx responses.
- [ ] Add rate limiting strategy notes and optional KV-backed request counters.
- [ ] Add structured request logging toggles for incident triage.

## Phase 3 — Domain launch and routing

- [ ] Revisit temporary root redirects in `netlify.toml` once `newmexicosocialists.org` transfer completes.
- [ ] Add canonical host policy (apex ↔ www) and document DNS records.
- [ ] Add launch runbook with smoke checks and rollback path.

## Exit Criteria

1. Greenhouse calculator behavior is complete and reproducible for community planning.
2. Greenhouse writeups are internally consistent and bilingually aligned.
3. Worker endpoints are configurable, documented, and monitored.
4. Domain cutover checklist is executable end-to-end without tribal knowledge.
