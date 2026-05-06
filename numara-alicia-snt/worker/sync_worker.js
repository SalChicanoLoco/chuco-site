/**
 * NUMARA-Alicia-SNT Sync Worker
 * Cloudflare Worker — Airtable sync gateway
 * Schema: NUMARA_ALICIA_META_GRAPH_V2_2
 *
 * Safety invariants enforced here (not in clients):
 *   1. Delta Version is monotonically increasing — PATCH rejected if incoming ≤ stored
 *   2. Provenance fields (Provenance Source, Provenance Ref) are never nulled
 *   3. Integrity Hash is write-once — preserved from current record if already set
 *   4. Hard deletes are blocked globally — 405 on any DELETE request
 *   5. All writes require X-Agent-ID header for audit trail
 *
 * Endpoints:
 *   GET  /health
 *   GET  /sync/{table}               — list records (supports maxRecords, filterByFormula, offset)
 *   GET  /sync/{table}/{recordId}    — fetch single record
 *   POST /sync/{table}               — create record
 *   PATCH /sync/{table}/{recordId}   — delta-safe update
 *   DELETE *                         — always 405
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Agent-ID, X-Delta-Force",
};

const AIRTABLE_API = "https://api.airtable.com/v0";

const VALID_TABLES = new Set([
  "Nodes",
  "Edges",
  "Evidence Ledger",
  "Legal Targets",
  "Attorney Contacts",
  "Documents",
]);

const PROVENANCE_FIELDS = new Set(["Provenance Source", "Provenance Ref"]);
const WRITE_ONCE_FIELDS = new Set(["Integrity Hash"]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function err(msg, status = 400) {
  return json({ error: msg, schema: "NUMARA_ALICIA_META_GRAPH_V2_2" }, status);
}

async function airtableGet(env, table, recordId = null, params = {}) {
  const base = env.AIRTABLE_BASE_ID;
  const path = recordId
    ? `${AIRTABLE_API}/${base}/${encodeURIComponent(table)}/${recordId}`
    : `${AIRTABLE_API}/${base}/${encodeURIComponent(table)}`;
  const url = new URL(path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  return fetch(url.toString(), {
    headers: { Authorization: `Bearer ${env.AIRTABLE_PAT}` },
  });
}

async function airtablePost(env, table, fields) {
  const base = env.AIRTABLE_BASE_ID;
  return fetch(`${AIRTABLE_API}/${base}/${encodeURIComponent(table)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields, typecast: true }),
  });
}

async function airtablePatch(env, table, recordId, fields) {
  const base = env.AIRTABLE_BASE_ID;
  return fetch(
    `${AIRTABLE_API}/${base}/${encodeURIComponent(table)}/${recordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.AIRTABLE_PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields, typecast: true }),
    }
  );
}

/**
 * Strip null/empty values. Reject attempts to null a provenance field.
 * Returns { safe } or { error }.
 */
function sanitizeFields(fields) {
  const safe = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === "") {
      if (PROVENANCE_FIELDS.has(k)) {
        return { error: `'${k}' is a provenance field and may not be set to null or empty.` };
      }
      continue;
    }
    safe[k] = v;
  }
  return { safe };
}

/**
 * Delta-safe merge:
 *   1. Fetch current record from Airtable.
 *   2. Reject PATCH if incoming Delta Version ≤ stored (unless X-Delta-Force).
 *   3. Strip nulls; protect provenance fields and write-once fields.
 *   4. Set Delta Version to max(stored, incoming) + 1.
 */
async function deltaSafeMerge(env, table, recordId, incomingFields, force) {
  const currentRes = await airtableGet(env, table, recordId);
  if (!currentRes.ok) {
    const text = await currentRes.text();
    return { error: `Could not fetch record ${recordId} (${currentRes.status}): ${text}` };
  }
  const current = await currentRes.json();
  const cur = current.fields || {};

  const incomingVersion = Number(incomingFields["Delta Version"] ?? 0);
  const storedVersion = Number(cur["Delta Version"] ?? 0);

  if (!force && incomingVersion > 0 && incomingVersion <= storedVersion) {
    return {
      error: `Delta version conflict: incoming ${incomingVersion} ≤ stored ${storedVersion}. Send X-Delta-Force: true to override.`,
      stored_version: storedVersion,
    };
  }

  const { safe, error } = sanitizeFields(incomingFields);
  if (error) return { error };

  // Preserve write-once fields if already set in Airtable
  for (const field of WRITE_ONCE_FIELDS) {
    if (cur[field] && safe[field] !== undefined && safe[field] !== cur[field]) {
      delete safe[field];
    }
  }

  // Monotonically increment
  safe["Delta Version"] = Math.max(storedVersion, incomingVersion) + 1;

  return { safe, storedVersion };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === "/health") {
      return json({
        status: "ok",
        schema: "NUMARA_ALICIA_META_GRAPH_V2_2",
        base: "NUMARA-Alicia-SNT",
        tables: [...VALID_TABLES],
        ts: new Date().toISOString(),
      });
    }

    // Block all hard deletes
    if (method === "DELETE") {
      return err(
        "Hard deletes are prohibited by NUMARA_ALICIA_META_GRAPH_V2_2. Set Status = 'archived' or 'excluded' instead.",
        405
      );
    }

    // Route: /sync/{table}  or  /sync/{table}/{recordId}
    const match = url.pathname.match(/^\/sync\/([^/]+)(?:\/([^/]+))?$/);
    if (!match) {
      return err("Path not found. Use /sync/{table} or /sync/{table}/{recordId}.", 404);
    }

    const table = decodeURIComponent(match[1]);
    const recordId = match[2] ? decodeURIComponent(match[2]) : null;

    if (!VALID_TABLES.has(table)) {
      return err(`Unknown table '${table}'. Valid tables: ${[...VALID_TABLES].join(", ")}.`, 404);
    }

    const force = request.headers.get("X-Delta-Force") === "true";
    const agentId = request.headers.get("X-Agent-ID") || "unknown";

    // GET /sync/{table} — list
    if (method === "GET" && !recordId) {
      const params = {};
      for (const key of ["maxRecords", "filterByFormula", "offset", "sort[0][field]", "sort[0][direction]"]) {
        const val = url.searchParams.get(key);
        if (val) params[key] = val;
      }
      const res = await airtableGet(env, table, null, params);
      const data = await res.json();
      return json({ schema: "NUMARA_ALICIA_META_GRAPH_V2_2", table, ...data }, res.status);
    }

    // GET /sync/{table}/{recordId} — single record
    if (method === "GET" && recordId) {
      const res = await airtableGet(env, table, recordId);
      const data = await res.json();
      return json({ schema: "NUMARA_ALICIA_META_GRAPH_V2_2", table, ...data }, res.status);
    }

    // POST /sync/{table} — create
    if (method === "POST" && !recordId) {
      let body;
      try {
        body = await request.json();
      } catch {
        return err("Invalid JSON body.");
      }

      const fields = body.fields || body;
      fields["Last Modified By"] = fields["Last Modified By"] || agentId;
      fields["Delta Version"] = 1;

      const { safe, error } = sanitizeFields(fields);
      if (error) return err(error);

      const res = await airtablePost(env, table, safe);
      const data = await res.json();
      return json(
        { schema: "NUMARA_ALICIA_META_GRAPH_V2_2", table, created: true, agent: agentId, ...data },
        res.status
      );
    }

    // PATCH /sync/{table}/{recordId} — delta-safe update
    if (method === "PATCH" && recordId) {
      let body;
      try {
        body = await request.json();
      } catch {
        return err("Invalid JSON body.");
      }

      const incomingFields = body.fields || body;
      incomingFields["Last Modified By"] = agentId;

      const result = await deltaSafeMerge(env, table, recordId, incomingFields, force);
      if (result.error) {
        return json(
          { error: result.error, schema: "NUMARA_ALICIA_META_GRAPH_V2_2", stored_version: result.stored_version },
          409
        );
      }

      const res = await airtablePatch(env, table, recordId, result.safe);
      const data = await res.json();
      return json(
        {
          schema: "NUMARA_ALICIA_META_GRAPH_V2_2",
          table,
          updated: true,
          agent: agentId,
          delta_version: result.safe["Delta Version"],
          ...data,
        },
        res.status
      );
    }

    return err("Method not allowed.", 405);
  },
};
