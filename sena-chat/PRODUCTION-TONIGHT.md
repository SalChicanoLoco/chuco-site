# Sena Chat — Production Path for Tonight

## Recommendation

Use the **existing Clojure terminal app** tonight.

There are two plausible paths:

1. **Current repo app (`sena-chat`)** — Clojure REPL-style terminal chat using Anthropic Messages API, persistent EDN graph sessions, persona voices, and Quetzal Core.
2. **Claude Code SDK / TypeScript or Python agent path** — stronger long-term base for an agentic web-dev bot with tools, permissions, and richer automation.

For tonight, the Clojure app is closer to production because it already exists in this repo, already stores conversation state, already has voices, already has `/quetzal`, and now has `make chat-check` / `make chat-live` checks. The SDK route is better for the future web-dev bot, but it would introduce new package/runtime choices and more moving parts before you can simply talk to the system.

## Model choice

Use:

```text
claude-sonnet-4-6
```

Why: Anthropic's current model overview lists **Claude Sonnet 4.6** as the best speed/intelligence balance with the Claude API ID `claude-sonnet-4-6`. Anthropic recommends Opus 4.7 for the most complex tasks, but Sonnet 4.6 is the better tonight default for an interactive terminal chat because it is fast, capable, and cheaper than Opus-tier usage.

## Tonight checklist

From repo root:

```bash
make check
make chat-check
```

If `make chat-check` says `clj` is missing on macOS:

```bash
brew install clojure/tools/clojure
```

Then set the key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export ANTHROPIC_MODEL=claude-sonnet-4-6
```

Spend one tiny smoke-test request:

```bash
make chat-live
```

If that passes, start the app:

```bash
cd sena-chat
clj -M:run
```

Inside the app:

```text
/quetzal
/voice aria
Hola Aria, resume dónde estamos.
```

## Hard next steps for agents

1. Keep `sena-chat` as the tonight path until a live REPL session succeeds.
2. Do not migrate to Claude Code SDK until the terminal app has a successful live chat run.
3. Add streaming only after the basic blocking request works.
4. Add a browser UI only after the terminal graph/session model is proven.
5. For the future web-dev bot, create a separate SDK spike with its own `make web-bot-check` target.

## Research sources

- Anthropic Models overview: Sonnet 4.6 is documented as the speed/intelligence balance model and `claude-sonnet-4-6` is the Claude API ID: https://docs.anthropic.com/en/docs/about-claude/models/overview
- Anthropic Working with Messages: the Messages API supports custom agent loops and multi-turn conversations by sending full conversation history: https://platform.claude.com/docs/en/build-with-claude/working-with-messages
- Anthropic Claude Code SDK overview: the SDK is a better future fit for production-ready agents and web-dev automation, but it adds new runtime/package choices: https://docs.anthropic.com/en/docs/claude-code/sdk
