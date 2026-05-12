/**
 * NUMARA Voice Worker — Aria's Voice
 * Cloudflare Worker · OpenAI TTS/transcription proxy
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SUPPORTED_TTS_MODELS = new Set(["tts-1", "tts-1-hd", "gpt-4o-mini-tts"]);
const SUPPORTED_TRANSCRIPTION_MODELS = new Set(["whisper-1", "gpt-4o-mini-transcribe"]);
const DEFAULT_MAX_AUDIO_BYTES = 10 * 1024 * 1024;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function isAuthorizedRequest(request, env) {
  const expected = (env.VOICE_ACCESS_TOKEN || "").trim();
  if (!expected) return true;
  const header = request.headers.get("Authorization") || "";
  return header === `Bearer ${expected}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "numara-voice-worker" });
    }

    if (!isAuthorizedRequest(request, env)) {
      return json({ error: "Forbidden" }, 403);
    }

    if (url.pathname === "/tts") {
      if (request.method !== "POST") {
        return json({ error: "POST only" }, 405);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const text = (body.text || "").slice(0, 4096);
      const voice = body.voice || "nova";
      const model = SUPPORTED_TTS_MODELS.has(body.model) ? body.model : "tts-1";
      const speed = Number(body.speed ?? 0.9);

      if (!text.trim()) {
        return json({ error: "No text" }, 400);
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
        return json({ error: await res.text() }, res.status);
      }

      return new Response(res.body, {
        status: 200,
        headers: { ...CORS, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
      });
    }

    if (url.pathname === "/transcribe") {
      if (request.method !== "POST") {
        return json({ error: "POST only" }, 405);
      }

      const maxBytes = Number(env.MAX_AUDIO_BYTES || DEFAULT_MAX_AUDIO_BYTES);
      const contentLength = Number(request.headers.get("content-length") || "0");
      if (contentLength > maxBytes) {
        return json({ error: "Audio file too large", limit: maxBytes }, 413);
      }

      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return json({ error: "Missing audio file" }, 400);
      }
      if (file.size > maxBytes) {
        return json({ error: "Audio file too large", limit: maxBytes }, 413);
      }

      const model = SUPPORTED_TRANSCRIPTION_MODELS.has(form.get("model"))
        ? form.get("model")
        : "whisper-1";

      const upstream = new FormData();
      upstream.set("file", file, file.name || "audio.webm");
      upstream.set("model", model);
      if (form.get("language")) upstream.set("language", String(form.get("language")));
      if (form.get("prompt")) upstream.set("prompt", String(form.get("prompt")));

      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.OPENAI_KEY}` },
        body: upstream,
      });

      if (!res.ok) {
        return json({ error: await res.text() }, res.status);
      }

      const payload = await res.json();
      return json(payload);
    }

    return json({ error: "Not found" }, 404);
  },
};
