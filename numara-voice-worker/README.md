# NUMARA Voice Worker

Cloudflare Worker proxy for Aria voice services. The browser never receives the OpenAI API key; Cloudflare stores it as `OPENAI_KEY`.

## Routes

- `GET /health` — deployment sanity check; no OpenAI call and no secret values returned.
- `POST /tts` — text to speech through OpenAI `audio/speech`.
- `POST /transcribe` — audio transcription through OpenAI `audio/transcriptions`.

## Required secrets

```bash
wrangler secret put OPENAI_KEY
```

Recommended for CLI/server-to-server tests and private tools:

```bash
wrangler secret put VOICE_ACCESS_TOKEN
```

## Deploy and verify

```bash
wrangler deploy
curl -sS https://numara-voice.salvadorsena.workers.dev/health | jq .
```

For TTS, replace `$VOICE_ACCESS_TOKEN` with the exact value you stored in Cloudflare. Do not send the literal placeholder string.

```bash
curl -sS -D /tmp/aria-headers.txt \
  https://numara-voice.salvadorsena.workers.dev/tts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VOICE_ACCESS_TOKEN" \
  -d '{"text":"Buenos días Salvador. Aria online.","voice":"nova","speed":0.9}' \
  --output test-aria.mp3

cat /tmp/aria-headers.txt
file test-aria.mp3
```

Expected success:

- HTTP `200`
- `content-type: audio/mpeg`
- `file test-aria.mp3` reports MPEG/audio data

If `file test-aria.mp3` says JSON, read the response body:

```bash
cat test-aria.mp3 | jq .
```

That means the Worker returned a structured error instead of audio. Common causes:

- `403`: missing or wrong `VOICE_ACCESS_TOKEN`.
- `429`: OpenAI account/rate/quota limit. The Worker is wired correctly, but OpenAI declined the request.
- `401`: `OPENAI_KEY` is missing, pasted incorrectly, or invalid.

## Cost-conscious defaults

The worker defaults to `tts-1` for speech and `whisper-1` for transcription. These align with the current low-cost constrained deployment plan and can be changed later through Wrangler vars once paid capacity is available.
