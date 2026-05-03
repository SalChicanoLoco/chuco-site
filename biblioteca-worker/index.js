/**
 * Biblioteca API — Cloudflare Worker
 * Proxies Airtable so the PAT never touches client code.
 *
 * Env vars (set via wrangler.toml or `wrangler secret put`):
 *   AIRTABLE_KEY   — Personal Access Token (secret)
 *   AIRTABLE_BASE  — Base ID (var)
 *   AIRTABLE_TABLE — Table ID (var)
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: CORS });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Only serve /volumes
    if (url.pathname !== '/volumes') {
      return new Response('Not found', { status: 404, headers: CORS });
    }

    const airtableUrl = new URL(
      `https://api.airtable.com/v0/${env.AIRTABLE_BASE}/${env.AIRTABLE_TABLE}`
    );

    // Return only Published records, sorted by Volume Number
    airtableUrl.searchParams.set(
      'filterByFormula',
      `{Status} = "Published"`
    );
    airtableUrl.searchParams.set('sort[0][field]', 'Volume Number');
    airtableUrl.searchParams.set('sort[0][direction]', 'asc');

    // Only fetch the fields the front end needs
    const fields = [
      'Title EN', 'Title ES', 'Volume Number', 'Series',
      'Excerpt EN', 'Excerpt ES', 'GitHub URL', 'Publish Date',
      'Tags', 'Free to Share',
    ];
    fields.forEach((f, i) => airtableUrl.searchParams.set(`fields[${i}]`, f));

    const resp = await fetch(airtableUrl.toString(), {
      headers: {
        Authorization: `Bearer ${env.AIRTABLE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error('Airtable error', resp.status, body);
      return new Response(JSON.stringify({ error: 'Upstream error', status: resp.status }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();

    // Flatten Airtable's fields wrapper for the client
    const volumes = data.records.map(r => ({
      id:          r.id,
      vol:         r.fields['Volume Number'],
      titleEN:     r.fields['Title EN']      || '',
      titleES:     r.fields['Title ES']      || '',
      series:      r.fields['Series']        || '',
      excerptEN:   r.fields['Excerpt EN']    || '',
      excerptES:   r.fields['Excerpt ES']    || '',
      url:         r.fields['GitHub URL']    || '',
      date:        r.fields['Publish Date']  || '',
      tags:        r.fields['Tags']          || '',
      freeToShare: r.fields['Free to Share'] || false,
    }));

    return new Response(JSON.stringify({ volumes }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  },
};
