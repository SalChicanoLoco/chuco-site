# collective

## Public Beta Routing

* `/` — Sena Colectivo services and master landing
* `/biblioteca/` — La Biblioteca landing
* `newmexicosocialists.org` — partner site, to host NM News Feed and future org rebuild
* `Sena Colectivo` provides services, publication infrastructure, research workflows, and grants-as-a-service.
* Service revenue supports site maintenance, publications, and seed funding for partner civic infrastructure.

### Staging Note

`staging/newmexicosocialists/nmnewsfeed.html` is intended for the future newmexicosocialists.org rebuild.

## Agent-friendly checks

Agents should run the dependency-light verification harness before opening PRs:

```bash
make check
```

This runs `python3 scripts/agent_check.py`, which checks Worker syntax, Biblioteca privacy/UI guardrails, Quetzal Core naming, JSON validity, and balanced Clojure delimiters without requiring Cloudflare auth, production secrets, Clojure CLI, or a browser. See `docs/WEB_DEV_BOT.md` for the web-dev bot workflow.
