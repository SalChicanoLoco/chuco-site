# Sena Chat — Clojure × Claude

A terminal chat application backed by the Anthropic Claude API.  
Conversations are stored as a **persistent immutable directed graph** using Clojure's native data structures and serialised to EDN on every turn.

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 11 + |
| Clojure CLI | 1.11 + |

Export your Anthropic API key before running:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```


## API readiness check

Before running a live chat session, use the repo-level dry-run check:

```bash
make chat-check
```

Then set your key and optionally override the default model:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export ANTHROPIC_MODEL=claude-sonnet-4-6   # optional; this is the default
```

To spend one tiny request and prove the key/model work before entering the REPL:

```bash
make chat-live
```

## Run

```bash
cd sena-chat
clj -M:run
```

Or with Leiningen (requires a `project.clj` — see below):

```bash
lein run
```

## What you get at startup

```
╔══════════════════════════════════════╗
║   Sena Chat  ·  Clojure × Claude     ║
╚══════════════════════════════════════╝
  /voice <aria|nova|vex|grant>  — switch persona
  /quit                          — exit

Available sessions:
  [0] 20240426-143022
  [n] Start new session
Choose:
```

Existing sessions are listed and can be resumed. Choosing `n` starts fresh.

## In-session commands

| Command | Effect |
|---------|--------|
| `/voice aria` | Switch to Aria (warm teacher) |
| `/voice nova` | Switch to Nova (strategic PM) |
| `/voice vex`  | Switch to Vex (precise R&D) |
| `/voice grant`| Switch to Grant (storytelling) |
| `/quetzal`    | Show the canonical Quetzal Core contract |
| `/quit`       | Exit the REPL |

Any other input is sent to Claude under the active voice persona.

## Bilingual support

Write in English or Spanish — the active persona replies in whatever language you use. No translation layer; the content is passed through as-is.

## Graph model

Every message is a node; every reply is a `:reply-to` edge; every voice switch is a `:voice-switch` edge.

```clojure
{:graph
  {:nodes {"msg-0001" {:id "msg-0001" :role :user   :content "Hola"
                        :timestamp "2024-04-26T14:30:22Z" :voice :aria}
           "msg-0002" {:id "msg-0002" :role :assistant :content "¡Hola! …"
                        :timestamp "2024-04-26T14:30:23Z" :voice :aria
                        :parent "msg-0001"}}
   :edges [{:id "rel-0001" :type :reply-to
             :source "msg-0002" :target "msg-0001"}]
   :root "msg-0001"
   :active-voice :aria}
 :meta {:msg-counter 2 :rel-counter 1 :version 2 :session-id "20240426-143022"}}
```


## Quetzal Core contract

Quetzal Core is the canonical coordination substrate for the chat graph. It collapses spelling drift (`Quetzal`, `Quetzl`, `Quetzal Core`) into one named core so future work does not create duplicate versions or competing abstractions. The current contract tracks:

* one canonical core identity and version;
* swarm-time behavior as turns, pulses, and handoffs;
* memristor-style memory where repeated paths strengthen over time;
* isomorphic agents that share graph shape while preserving distinct voices and permissions.

Use `/quetzal` in the REPL to print the active contract.

## Session persistence

Sessions live in `./sessions/`:

```
sessions/
  20240426-143022.edn       ← current (overwritten each turn)
  20240426-143022_v1.edn    ← immutable snapshot after turn 1
  20240426-143022_v2.edn    ← immutable snapshot after turn 2
  …
```

Snapshots are never overwritten.

## Namespace structure

| Namespace | Role |
|-----------|------|
| `sena.chat.core`    | Entry point, REPL loop, command dispatch |
| `sena.chat.graph`   | Pure graph operations (no I/O) |
| `sena.chat.api`     | Anthropic HTTP call (clj-http) |
| `sena.chat.voices`  | Persona system-prompt strings |
| `sena.chat.session` | EDN serialise / deserialise |
| `sena.chat.quetzal` | Canonical Quetzal Core naming/version/principles |

## Leiningen project.clj (optional)

If you prefer `lein run`, add this file at `sena-chat/project.clj`:

```clojure
(defproject sena-chat "0.1.0"
  :dependencies [[org.clojure/clojure  "1.12.0"]
                 [clj-http/clj-http    "3.13.0"]
                 [cheshire/cheshire    "5.13.0"]
                 [org.clojure/data.json "2.5.0"]]
  :main sena.chat.core
  :source-paths ["src"])
```
