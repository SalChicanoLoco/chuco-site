# Shared Template System — Sena Colectivo

Shared design tokens, page templates, and a Cloudflare Worker template for both sites:

- **`docs.senacolectivo.com`** — La Biblioteca, CGS tools
- **`newmexicosocialists.org`** — NM Socialists news feed, events, organizing

---

## Files

```
shared/
  sena-system.css          — Design system: tokens + all component CSS
  template-article.html    — Blank article page (La Biblioteca volumes)
  template-landing.html    — Hub/landing page with hero + card grid
  template-newsfeed.html   — Two-pane news feed (wired to Worker data)
  worker-template/
    index.js               — Cloudflare Worker template (Airtable proxy)
    wrangler.toml          — Wrangler config template
  README.md                — This file
```

---

## Using the design system CSS

Add this `<link>` to any page's `<head>`:

```html
<link rel="stylesheet" href="/shared/sena-system.css">
```

The file loads the Google Fonts (Fraunces, DM Sans, DM Mono) and defines all design tokens and component classes. No other CSS file is needed for standard pages.

**NM Socialists theme:** Add `class="theme-nms"` to `<body>` to swap the terracotta accent for the NMS red palette:

```html
<body id="page" class="theme-nms">
```

**Bilingual toggle:** Add `class="lang-es"` to `<body>` (done automatically by the toggle script) to flip EN/ES display.

---

## Creating a new article page

1. Copy `shared/template-article.html` to your target path, e.g. `biblioteca/vol7/index.html`.
2. Find every `<!-- REPLACE: ... -->` comment and fill it in.
3. Key spots:
   - `<title>` — `Vol. XX — Article Title · La Biblioteca`
   - `<body id="page">` — add `class="theme-nms"` for NMS pages
   - `.vol-id` — volume/series/date line
   - `.cover-h1` — EN and ES headline (use `<em>` for the gold italic word)
   - `.cover-sub` — subtitle in both languages
   - `.cover-lede` — 1–2 sentence hook in both languages
   - `.cover-tags` — use `ctag hot` for the 1–2 primary tags
   - `.section` blocks — duplicate as needed; each has EN + ES heading and body text
   - `.refs` — add one `.ref-item` per source
   - `footer .footer-brand` — volume name
4. The EN/ES toggle script at the bottom of the template is pre-wired. Do not change the `id="page"`, `id="btnEN"`, `id="btnES"` attributes.

---

## Creating a new landing page

1. Copy `shared/template-landing.html` to your target path, e.g. `your-project/index.html`.
2. The template has a hero section, a card grid section, and a focus-list section.
3. Replace:
   - Hero headline, sub, body, and CTA buttons
   - Card grid items (duplicate `.card` blocks as needed)
   - Focus list items (duplicate `.focus-item` blocks as needed)
   - Footer brand and meta line

---

## Creating a new news feed page

1. Copy `shared/template-newsfeed.html` to your target path.
2. Set `body class="theme-nms"` if it is an NM Socialists page.
3. In the `<script>` block, set `DATA_URL` to your Cloudflare Worker endpoint:

```js
const DATA_URL = 'https://your-worker.workers.dev/articles';
```

4. Update the filter buttons to match your `Series` field values.
5. Update the masthead brand name and footer.

**Expected data shape from the Worker:**

```json
{
  "volumes": [
    {
      "id":        "recXXX",
      "vol":       1,
      "titleEN":   "Title in English",
      "titleES":   "Título en español",
      "series":    "Land Grant Series",
      "excerptEN": "Short excerpt...",
      "excerptES": "Extracto corto...",
      "url":       "https://...",
      "date":      "2026-01-15",
      "tags":      "Land Grant, Genízaro",
      "freeToShare": true
    }
  ]
}
```

---

## Deploying a new Cloudflare Worker

1. Copy `shared/worker-template/` to your worker directory:

```bash
cp -r shared/worker-template/ your-worker/
```

2. In `your-worker/wrangler.toml`, fill in:
   - `name` — unique worker name (lowercase, hyphens)
   - `account_id` — your Cloudflare account ID
   - `AIRTABLE_BASE` — Airtable base ID (from the API docs for your base)
   - `AIRTABLE_TABLE` — Airtable table ID

3. In `your-worker/index.js`, fill in all `/* REPLACE */` comments:
   - `ARTICLE_FIELDS` — field names from your Airtable table
   - The field mapping in `handleArticles()` — map Airtable field names to the output shape
   - The filter formula — match your Status field values

4. Set your Airtable Personal Access Token as a secret (never in `wrangler.toml`):

```bash
wrangler secret put AIRTABLE_KEY
```

The token needs these Airtable scopes: `data.records:read`, `schema.bases:read`.
Create one at: <https://airtable.com/create/tokens>

5. Deploy:

```bash
wrangler deploy
```

6. Test the endpoints:

```
GET https://your-worker.workers.dev/health
GET https://your-worker.workers.dev/articles
GET https://your-worker.workers.dev/pipeline
```

---

## Color system

| Token      | Hex           | Use when                                             |
|------------|---------------|------------------------------------------------------|
| `--earth`  | `#1a1209`     | Masthead, footer backgrounds                         |
| `--warm`   | `#2a1f0e`     | Cover band, card backgrounds, secondary dark bg      |
| `--cream`  | `#fdf6ea`     | Page background (light pages)                        |
| `--sand`   | `#f5ead8`     | Primary text on dark backgrounds                     |
| `--ink`    | `#1c1410`     | Body text on light backgrounds                       |
| `--terr`   | `#c2603a`     | Primary accent: borders, labels, hot tags, stat tops |
| `--gold`   | `#e8a825`     | Masthead brand name, pull quote border, headline em  |
| `--sage`   | `#6b8f5e`     | Nature/land/ecology contexts                         |
| `--sky`    | `#4a7fa5`     | Water/acequia/environmental contexts                 |
| `--border` | `rgba(194,96,58,0.18)` | All hairline borders and dividers           |

**NM Socialists overrides** (active when `body.theme-nms`):

| Token          | Hex       | Replaces  |
|----------------|-----------|-----------|
| `--nms-red`    | `#c0392b` | `--terr`  |
| `--nms-red-dark` | `#8b1a1a` | —       |
| `--nms-warm`   | `#1c0f0f` | `--warm`  |

---

## EN/ES bilingual pattern

All content is marked up in parallel with `.en` / `.es` block classes or `.en-inline` / `.es-inline` for inline spans. The default state shows EN; adding `lang-es` to `<body>` inverts visibility.

**Block elements** (use for paragraphs, headings, divs):

```html
<p class="body-text en">English text.</p>
<p class="body-text es">Texto en español.</p>
```

**Inline elements** (use inside a single shared element):

```html
<a href="/biblioteca/">← <span class="en-inline">Archive</span><span class="es-inline">Archivo</span></a>
```

**Toggle script** (copy verbatim before `</body>`):

```html
<script>
(function () {
  const saved = localStorage.getItem('bib_lang');
  const lang  = saved || (navigator.language?.startsWith('es') ? 'es' : 'en');
  if (lang === 'es') setLang('es', true);
})();

function setLang(l, init) {
  document.getElementById('page').className = l === 'es' ? 'lang-es' : '';
  document.getElementById('btnEN').className = 'lt-btn' + (l === 'en' ? ' active' : '');
  document.getElementById('btnES').className = 'lt-btn' + (l === 'es' ? ' active' : '');
  if (!init) localStorage.setItem('bib_lang', l);
  document.documentElement.lang = l;
}
</script>
```

Note: if the page uses `theme-nms` on `<body>`, preserve it when toggling:

```js
function setLang(l, init) {
  const body = document.getElementById('page');
  body.className = body.className.replace(/\blang-es\b/, '').trim();
  if (l === 'es') body.className += ' lang-es';
  // ... rest unchanged
}
```

---

## Notes

- Do not touch `biblioteca/index.html` — it is maintained by a separate process.
- All templates use relative paths (`/shared/sena-system.css`) which resolve correctly when served from the repository root on Vercel or Cloudflare Pages.
- The `bib_lang` localStorage key is shared across all pages so language preference persists site-wide.
