export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors() });
    }
    const url = new URL(request.url);
    if (url.pathname !== '/api/generate-axolotl-skin') {
      return new Response('Not found', { status: 404, headers: cors() });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors() });
    }
    try {
      const { prompt } = await request.json();
      const finalPrompt = prompt || 'Bioluminescent axolotl, transparent background, game-ready sprite frame.';

      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: finalPrompt,
          size: '1024x1024',
          background: 'transparent'
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({ error: errText }), { status: 500, headers: { ...cors(), 'Content-Type': 'application/json' } });
      }

      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) {
        return new Response(JSON.stringify({ error: 'No image returned from OpenAI.' }), { status: 500, headers: { ...cors(), 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ imageBase64: b64 }), {
        headers: { ...cors(), 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors(), 'Content-Type': 'application/json' } });
    }
  }
};

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
