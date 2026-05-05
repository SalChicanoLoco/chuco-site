/**
 * Sena Colectivo — Cloudflare Worker Template
 * ─────────────────────────────────────────────
 * Copy this file into your worker directory.
 * Fill in all /* REPLACE */ comments before deploying.
 *
 * Env vars — set in wrangler.toml [vars] or via `wrangler secret put`:
 *   AIRTABLE_KEY    — Personal Access Token  (secret — never commit)
 *   AIRTABLE_BASE   — Base ID, e.g. "appXXXXXXXXXXXXXX"  (var)
 *   AIRTABLE_TABLE  — Table ID, e.g. "tblXXXXXXXXXXXXXX"  (var)
 *
 * Endpoints served:
 *   GET /health     — liveness probe
 *   GET /articles   — published articles/volumes (proxies Airtable)
 *   GET /pipeline   — non-done pipeline items    (proxies Airtable)
 *
 * CORS: open (*) by default — tighten ALLOWED_ORIGINS for production.
 */

/* ── CORS ─────────────────────────────────────────────────────── */
const CORS = {
  'Access-Control-Allow-Origin':  '*', /* REPLACE: restrict to your domain in prod */
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/* ── FIELD LISTS ──────────────────────────────────────────────── */
/*
  REPLACE: list the Airtable field names your front end needs.
  Fewer fields = faster requests.
*/
const ARTICLE_FIELDS = [
  'Title EN',
  'Title ES',
  'Volume Number',  /* REPLACE: remove if not a volume-based publication */
  'Series',
  'Excerpt EN',
  'Excerpt ES',
  'GitHub URL',     /* REPLACE: your URL field name */
  'Publish Date',
  'Tags',
  'Free to Share',
  'Status',
];

const PIPELINE_FIELDS = [
  'Task',
  'Status',
  'Priority',
  'Notes',
  'Due Date',       /* REPLACE: remove if your table has no Due Date field */
];

/* ── MAIN HANDLER ─────────────────────────────────────────────── */
export default {
  async fetch(request, env) {
    /* Preflight */
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: CORS });
    }

    const url = new URL(request.url);

    /* ── /health ── */
    if (url.pathname === '/health') {
      return json({ ok: true, ts: Date.now() });
    }

    /* ── /articles ── */
    if (url.pathname === '/articles' || url.pathname === '/volumes') {
      return handleArticles(env);
    }

    /* ── /pipeline ── */
    if (url.pathname === '/pipeline') {
      return handlePipeline(env);
    }

    return new Response('Not found', { status: 404, headers: CORS });
  },
};

/* ── ARTICLES HANDLER ─────────────────────────────────────────── */
async function handleArticles(env) {
  const airtableUrl = new URL(
    `https://api.airtable.com/v0/${env.AIRTABLE_BASE}/${env.AIRTABLE_TABLE}`
  );

  /*
    REPLACE: adjust the filter formula and sort to match your schema.
    Common Status values: "Published", "Done", "Live".
  */
  airtableUrl.searchParams.set('filterByFormula', `{Status} = "Published"`);
  airtableUrl.searchParams.set('sort[0][field]', 'Volume Number'); /* REPLACE */
  airtableUrl.searchParams.set('sort[0][direction]', 'asc');

  ARTICLE_FIELDS.forEach((f, i) =>
    airtableUrl.searchParams.set(`fields[${i}]`, f)
  );

  const resp = await fetchAirtable(airtableUrl, env);
  if (!resp.ok) return airtableError(resp);

  const data    = await resp.json();
  /*
    REPLACE: map Airtable field names to the shape your front end expects.
    Keep the shape consistent across all workers so templates work unchanged.
  */
  const volumes = data.records.map(r => ({
    id:          r.id,
    vol:         r.fields['Volume Number'] || null, /* REPLACE */
    titleEN:     r.fields['Title EN']      || '',
    titleES:     r.fields['Title ES']      || '',
    series:      r.fields['Series']        || '',
    excerptEN:   r.fields['Excerpt EN']    || '',
    excerptES:   r.fields['Excerpt ES']    || '',
    url:         r.fields['GitHub URL']    || '', /* REPLACE: your URL field */
    date:        r.fields['Publish Date']  || '',
    tags:        r.fields['Tags']          || '',
    freeToShare: r.fields['Free to Share'] || false,
  }));

  return json({ volumes });
}

/* ── PIPELINE HANDLER ─────────────────────────────────────────── */
/*
  Returns tasks that are NOT "Done" — useful for a public roadmap widget.
  REPLACE: adjust the filter formula to match your Status field values.
*/
async function handlePipeline(env) {
  const airtableUrl = new URL(
    `https://api.airtable.com/v0/${env.AIRTABLE_BASE}/${env.AIRTABLE_TABLE}`
  );

  /*
    REPLACE: if you have a separate pipeline table, use a different table ID.
    If it's in the same table with a type/kind field, add that to the filter.
  */
  airtableUrl.searchParams.set('filterByFormula', `NOT({Status} = "Done")`);
  airtableUrl.searchParams.set('sort[0][field]', 'Priority'); /* REPLACE */
  airtableUrl.searchParams.set('sort[0][direction]', 'asc');

  PIPELINE_FIELDS.forEach((f, i) =>
    airtableUrl.searchParams.set(`fields[${i}]`, f)
  );

  const resp = await fetchAirtable(airtableUrl, env);
  if (!resp.ok) return airtableError(resp);

  const data  = await resp.json();
  const tasks = data.records.map(r => ({
    id:       r.id,
    task:     r.fields['Task']     || '',   /* REPLACE */
    status:   r.fields['Status']   || '',
    priority: r.fields['Priority'] || '',
    notes:    r.fields['Notes']    || '',
    due:      r.fields['Due Date'] || '',   /* REPLACE */
  }));

  return json({ tasks });
}

/* ── HELPERS ──────────────────────────────────────────────────── */
function fetchAirtable(url, env) {
  return fetch(url.toString(), {
    headers: {
      Authorization:  `Bearer ${env.AIRTABLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
}

async function airtableError(resp) {
  const body = await resp.text();
  console.error('Airtable error', resp.status, body);
  return json({ error: 'Upstream error', status: resp.status }, 502);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
