# Cloudflare Worker setup for AI skin generation

1. Install Wrangler: `npm i -g wrangler`
2. Authenticate: `wrangler login`
3. Set API key secret: `wrangler secret put OPENAI_API_KEY`
4. Deploy worker: `wrangler deploy`
5. In the app, click **Generate AI Skin** and paste worker URL.

Endpoint used by app:
- `POST /api/generate-axolotl-skin`
- body: `{ "prompt": "..." }`
- returns: `{ "imageBase64": "..." }`
