const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type'
};

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }));

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '');

  if (request.method === 'GET' && path === 'health') {
    return withCors(json({ ok: true, service: 'chuco-pages-functions', now: new Date().toISOString() }));
  }

  if (request.method === 'POST' && path === 'session') {
    const id = crypto.randomUUID();
    return withCors(json({ ok: true, sessionId: id, createdAt: Date.now() }));
  }

  if (request.method === 'POST' && path === 'telemetry') {
    let payload = {};
    try { payload = await request.json(); } catch (_) {}
    return withCors(json({ ok: true, accepted: true, event: payload?.event || 'unknown' }));
  }

  if (request.method === 'POST' && path === 'generate-style') {
    let prompt = 'algae-surfing biofilter guardian palette';
    try {
      const body = await request.json();
      if (typeof body?.prompt === 'string' && body.prompt.trim()) prompt = body.prompt.trim().slice(0, 240);
    } catch (_) {}

    if (!env.OPENAI_API_KEY) {
      return withCors(json({
        ok: true,
        source: 'fallback',
        reason: 'OPENAI_API_KEY not configured',
        style: {
          body: '#2f7f72',
          gill: '#84f0cf',
          spots: 'hsla(162 80% 90% / .85)'
        },
        prompt
      }));
    }

    // Conference-safe deterministic style response even when key exists.
    return withCors(json({
      ok: true,
      source: 'deterministic',
      style: {
        body: '#3b6acb',
        gill: '#8fe0ff',
        spots: 'hsla(200 90% 85% / .9)'
      },
      prompt
    }));
  }

  return withCors(json({ ok: false, error: 'Not found' }, 404));
}
