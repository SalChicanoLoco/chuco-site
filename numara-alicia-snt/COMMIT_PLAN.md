# NUMARA-Alicia-SNT — Airtable Scaffolding
## GitHub Commit Plan
**Status: PENDING SALVADOR APPROVAL. No deployment has been triggered.**

---

### Branch
`claude/airtable-numara-scaffolding-sv0m8` in `salchicanoloco/collective`

### Canonical Schema
`NUMARA_ALICIA_META_GRAPH_V2_2`

### Committed Files

| # | Path | Purpose |
|---|------|---------|
| 1 | `numara-alicia-snt/schema/airtable_schema_mapping.json` | Field definitions for all 6 Airtable tables |
| 2 | `numara-alicia-snt/worker/sync_worker.js` | Cloudflare Worker — sync gateway with delta-safe logic |
| 3 | `numara-alicia-snt/worker/wrangler.toml` | Worker config — zero secrets baked in |
| 4 | `numara-alicia-snt/api/ingest_schema.py` | FastAPI Pydantic models + enums for all 6 tables |
| 5 | `numara-alicia-snt/api/ingest_router.py` | FastAPI router — validates then forwards to sync worker |

---

### Table Creation Order
Linked fields require tables to exist before they are referenced.
Create in this exact order:

1. **Attorney Contacts** — no outbound links
2. **Legal Targets** — links → Attorney Contacts
3. **Nodes** — no required outbound links
4. **Documents** — links → Legal Targets, Attorney Contacts
5. **Evidence Ledger** — links → Nodes, Documents, Legal Targets
6. **Edges** — links → Nodes, Evidence Ledger

---

### Stable ID Prefixes

| Table | Prefix | Example |
|-------|--------|--------|
| Nodes | `N-` | `N-recABCDEFGHIJKLMN` |
| Edges | `E-` | `E-recABCDEFGHIJKLMN` |
| Evidence Ledger | `EV-` | `EV-recABCDEFGHIJKLMN` |
| Legal Targets | `LT-` | `LT-recABCDEFGHIJKLMN` |
| Attorney Contacts | `AC-` | `AC-recABCDEFGHIJKLMN` |
| Documents | `DOC-` | `DOC-recABCDEFGHIJKLMN` |

All IDs are Airtable formula fields (`CONCATENATE(prefix, RECORD_ID())`). They are permanent as long as the record exists.

---

### Safety Invariants

| Rule | Where Enforced |
|------|----------------|
| No hard deletes (DELETE → 405) | sync_worker.js |
| Delta Version monotonically increasing | sync_worker.js `deltaSafeMerge()` |
| Provenance fields never null | sync_worker.js `sanitizeFields()` + Pydantic `ProvenanceUpdateMixin` |
| Integrity Hash write-once | sync_worker.js `deltaSafeMerge()` |
| All writes carry agent ID | sync_worker.js header check + FastAPI router |
| Unknown fields rejected | FastAPI Pydantic layer (extra fields not allowed) |

---

### Deployment Steps (Requires Salvador Approval Before Running)

#### Step 1 — Create Airtable Base
```
1. Log into Airtable
2. Create new base: NUMARA-Alicia-SNT
3. Record the AIRTABLE_BASE_ID (starts with 'app...')
4. Create tables in the order specified above
5. Use airtable_schema_mapping.json as the field spec for each table
```

#### Step 2 — Deploy Cloudflare Sync Worker
```bash
cd numara-alicia-snt/worker
wrangler secret put AIRTABLE_PAT
wrangler secret put AIRTABLE_BASE_ID
wrangler secret put SYNC_ACCESS_TOKEN
wrangler deploy
# Note the deployed URL: https://numara-alicia-snt-sync.<account>.workers.dev
```

#### Step 3 — Deploy FastAPI Ingest Layer
```bash
cd numara-alicia-snt/api
pip install fastapi httpx uvicorn pydantic
export SYNC_WORKER_URL=https://numara-alicia-snt-sync.<account>.workers.dev
export INGEST_TOKEN_HASH=<sha256_hex_of_your_token>
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

### Required Secrets (Never Committed to Repo)

| Secret | Component | Description |
|--------|-----------|-------------|
| `AIRTABLE_PAT` | Cloudflare Worker | Airtable Personal Access Token |
| `AIRTABLE_BASE_ID` | Cloudflare Worker | Base ID for NUMARA-Alicia-SNT |
| `SYNC_ACCESS_TOKEN` | Cloudflare Worker | Auth token for sync clients |
| `SYNC_WORKER_URL` | FastAPI env | Deployed worker URL |
| `INGEST_TOKEN_HASH` | FastAPI env | SHA-256 hex of ingest API bearer token |

---



### Canonical Reconciliation Update (2026-05-06)

**Status:** Canonical approved for Gemini research pass after Claude cross-verification.

#### Integrated Claude Notes

- Added low-confidence investigative stubs (isolated + hold):
  - `city_contract_self_dealing`
  - `institutional_cover_up`
- Required properties for these stubs:
  - `claim_class: inference`
  - `source: speculative_inference`
  - `weight <= 0.35`
  - `status: HOLD`
  - `DO_NOT_EXPAND_IN_EMERGENCY_FILING`

#### Conflict Policy (Canonical)

Conflict clearance requests to prospective attorneys must explicitly disclose:

- **Cardinal Trust of Albuquerque, NM**

Reason: generic checks may miss indirect fiduciary/entity relationships.

#### Current Graph Priority

1. beneficiary stabilization
2. document preservation
3. trustee transition
4. distribution analysis
5. attorney intake
6. secondary investigations

#### Low-Confidence Tracks — HOLD

- `public_corruption_branch`
- `city_contract_self_dealing`
- `institutional_cover_up`
- `treble_damages_theory`

Operational rule: do **not** cite in emergency filings, expand narratively, escalate publicly, or convert into asserted facts.

#### Gemini Research Pass Constraints

Gemini receives **only** a constrained legal/documentary research prompt (not full graph), focused on:

- compelled accounting
- emergency relief / TRO
- trustee removal under `NMSA 46A-7-706`
- fiduciary impartiality
- New Mexico IPRA procedures

Research focus: documentary sufficiency, procedural sequencing, evidentiary thresholds, and filing prerequisites.

#### Post-Gemini Routing

Gemini output routes to Claude verification node for:

- citation verification
- procedural validation
- statute normalization
- `legal_reference` node generation

`legal_reference` node claim class policy:

- `verified_fact` if confirmed
- `inference` if uncertain

#### System State

- Graph: stable
- Claude: verification judiciary
- GPT: coordination + synthesis
- Gemini: constrained legal/documentary research
- Kimi: geometry stabilization + provenance normalization
- Codex: Airtable scaffolding + GitHub persistence

Primary bottleneck: documentary provenance closure.
Primary objective: beneficiary stabilization.
Final rule: **do not convert allegations into facts.**

### Salvador Approval Checklist

- [ ] Review `airtable_schema_mapping.json` — confirm all 6 tables, field names, and select options match case requirements
- [ ] Review `sync_worker.js` — confirm delta-safe logic, endpoint structure, and blocked DELETE semantics
- [ ] Review `ingest_schema.py` — confirm enums and validation rules match case classification system
- [ ] Review `ingest_router.py` — confirm routing, token auth, and field mapping
- [ ] Confirm Airtable base name: **NUMARA-Alicia-SNT**
- [ ] Approve Cloudflare Worker deployment (Step 2)
- [ ] Approve FastAPI deployment target and hosting environment (Step 3)
- [ ] Confirm merge from `claude/airtable-numara-scaffolding-sv0m8` into `main`

**All deployment commands require Salvador's explicit go-ahead.
This document is planning only — nothing has been deployed.**
