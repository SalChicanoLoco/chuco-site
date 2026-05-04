/**
 * NUMARA Voice Worker — Aria's Voice
 * Cloudflare Worker · OpenAI TTS proxy
 */

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname !== "/tts") {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), {
        status: 405,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const text = (body.text || "").slice(0, 4096);
    const voice = body.voice || "nova";
    const model = body.model || "tts-1-hd";
    const speed = Number(body.speed ?? 0.90);

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "No text" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, voice, input: text, speed }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), {
        status: res.status,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(res.body, {
      status: 200,
      headers: { ...CORS, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  },
};
