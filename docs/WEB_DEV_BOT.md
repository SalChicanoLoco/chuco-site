# Web Dev Bot Playbook

This repo should be easy for agents to inspect, patch, and verify without needing every production dependency installed locally.

## Default check

Run the dependency-light harness before opening a PR:

```bash
make check
```

Equivalent direct command:

```bash
python3 scripts/agent_check.py
```

The harness is intentionally built on Python standard library checks plus `node --check` for Worker syntax. It does **not** require Cloudflare auth, Airtable keys, OpenAI keys, the Clojure CLI, Playwright, or a browser.

## Why this exists

Some production checks are environment-bound:

- Cloudflare deploys require Wrangler auth and account secrets.
- OpenAI/Airtable smoke tests require live secrets and quota.
- Sena Chat is Clojure, but the Clojure CLI is not always installed in agent containers.
- Visual screenshots require a browser runtime.

When those tools are absent, the bot should still be able to catch the high-risk regressions: broken Worker syntax, raw Airtable exposure, missing voice auth, broken Quetzal naming, and accidental removal of the modern Biblioteca panel patterns.

## PR rule for agents

1. Keep patches small and scoped.
2. Run `make check`.
3. If a command warns because an optional dependency is missing, say so in the PR/final message.
4. Do not put secrets in code.
5. Do not deploy from a bot unless the user explicitly asks and the CLI is already authenticated.

## Future template direction

Once the true templates are built, the web dev bot should verify each template against a small contract file instead of guessing from screenshots. Recommended contract fields:

- `name` — template name.
- `routes` — expected public URLs.
- `dataSource` — Worker/API endpoint, never direct secret-bearing APIs.
- `designTokens` — required color/font token names.
- `accessibility` — keyboard, focus, reduced-motion, language requirements.
- `performanceBudget` — max dependency count, asset sizes, or CSS-only preference.
