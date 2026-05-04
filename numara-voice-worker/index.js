/**
 * NUMARA Voice Worker — Aria's Voice
 * Cloudflare Worker · OpenAI TTS proxy
 */

const CORS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Numara-Token",
  "Vary": "Origin",
};

const DEFAULT_ALLOWED_ORIGINS = [
  "https://docs.senacolectivo.com",
  "https://senacolectivo.com",
  "https://www.senacolectivo.com",
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname !== "/tts" && url.pathname !== "/transcribe") {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), {
        status: 405,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!isAuthorizedRequest(request, env)) {
      return new Response(JSON.stringify({ error: "Unauthorized voice request" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/transcribe") {
      const contentType = request.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return new Response(JSON.stringify({ error: "Use multipart/form-data with file" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return new Response(JSON.stringify({ error: "Missing audio file field: file" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (file.size > 15 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "Audio file too large (max 15MB)" }), {
          status: 413,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const upstreamForm = new FormData();
      upstreamForm.set("model", "whisper-1");
      upstreamForm.set("file", file, file.name || "audio.webm");
      const language = form.get("language");
      if (typeof language === "string" && language.trim()) upstreamForm.set("language", language.trim());

      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.OPENAI_KEY}` },
        body: upstreamForm,
      });

      if (!res.ok) {
        return handleUpstreamError(res, cors);
      }

      const data = await res.json();
      return new Response(JSON.stringify({ text: data.text || "" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const text = (body.text || "").slice(0, 4096);
    const voice = body.voice || "nova";
    const model = body.model || "tts-1-hd";
    const speed = Number(body.speed ?? 0.90);

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "No text" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
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
      return handleUpstreamError(res, cors);
    }

    return new Response(res.body, {
      status: 200,
      headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  },
};

function getAllowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
}

function getCorsHeaders(request, env) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins(env);
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    ...CORS,
    "Access-Control-Allow-Origin": allowOrigin,
  };
}

function isAuthorizedRequest(request, env) {
  const configuredToken = env.VOICE_ACCESS_TOKEN;
  if (configuredToken) {
    const auth = request.headers.get("authorization") || "";
    const headerToken = request.headers.get("x-numara-token") || "";
    if (auth === `Bearer ${configuredToken}` || headerToken === configuredToken) return true;
  }

  const origin = request.headers.get("origin");
  if (!origin) return env.ALLOW_NO_ORIGIN === "true";

  return getAllowedOrigins(env).includes(origin);
}

async function handleUpstreamError(res, cors) {
  let upstream = {};
  try {
    upstream = await res.json();
  } catch {
    upstream = {};
  }

  const safeMessageByStatus = {
    400: "Invalid audio request.",
    401: "Voice service authentication failed.",
    403: "Voice service request forbidden.",
    404: "Requested audio model or route not found.",
    413: "Audio payload too large.",
    429: "Voice service is rate-limited. Please retry shortly.",
  };

  const message = safeMessageByStatus[res.status] || "Audio request failed.";
  const responseBody = {
    error: message,
    status: res.status,
    code: upstream?.error?.code || null,
    type: upstream?.error?.type || null,
  };

  const retryAfter = res.headers.get("retry-after");
  const headers = { ...cors, "Content-Type": "application/json" };
  if (retryAfter) headers["Retry-After"] = retryAfter;

  return new Response(JSON.stringify(responseBody), {
    status: res.status,
    headers,
  });
}
