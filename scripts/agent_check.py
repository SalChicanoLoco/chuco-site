#!/usr/bin/env python3
"""Dependency-light repository checks for coding agents.

This intentionally avoids Cloudflare auth, Clojure CLI, browser drivers, and npm
packages. It gives agents a reliable baseline before they open a PR.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


@dataclass
class Result:
    status: str
    name: str
    detail: str = ""


results: list[Result] = []


def record(status: str, name: str, detail: str = "") -> None:
    results.append(Result(status, name, detail))


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def require_file(rel: str) -> str:
    path = ROOT / rel
    if path.exists():
        record("pass", f"file exists: {rel}")
        return path.read_text(encoding="utf-8")
    record("fail", f"file exists: {rel}", "missing")
    return ""


def require_contains(rel: str, haystack: str, needle: str, label: str | None = None) -> None:
    name = label or f"{rel} contains {needle!r}"
    if needle in haystack:
        record("pass", name)
    else:
        record("fail", name, "not found")


def require_order(rel: str, haystack: str, first: str, second: str, label: str) -> None:
    a = haystack.find(first)
    b = haystack.find(second)
    if a >= 0 and b >= 0 and a < b:
        record("pass", label)
    else:
        record("fail", label, f"order check failed in {rel}")


def run(cmd: list[str], cwd: Path = ROOT, warn_if_missing: bool = False) -> None:
    exe = shutil.which(cmd[0])
    rendered = " ".join(cmd)
    if exe is None:
        status = "warn" if warn_if_missing else "fail"
        record(status, rendered, f"{cmd[0]} not installed")
        return
    proc = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if proc.returncode == 0:
        record("pass", rendered)
    else:
        detail = (proc.stderr or proc.stdout).strip().splitlines()[:4]
        record("fail", rendered, " | ".join(detail))


def check_json(rel: str) -> None:
    try:
        json.loads(read(rel))
        record("pass", f"valid JSON: {rel}")
    except Exception as exc:  # noqa: BLE001 - report any parse failure
        record("fail", f"valid JSON: {rel}", str(exc))


def check_balanced_clojure(rel: str) -> None:
    text = require_file(rel)
    if not text:
        return

    stack: list[tuple[str, int]] = []
    pairs = {")": "(", "]": "[", "}": "{"}
    in_string = False
    escaped = False
    in_comment = False

    for idx, ch in enumerate(text):
        if in_comment:
            if ch == "\n":
                in_comment = False
            continue
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == ";":
            in_comment = True
        elif ch == '"':
            in_string = True
        elif ch in "([{":
            stack.append((ch, idx))
        elif ch in ")]}":
            if not stack or stack[-1][0] != pairs[ch]:
                record("fail", f"balanced Clojure delimiters: {rel}", f"mismatch at offset {idx}")
                return
            stack.pop()

    if in_string or stack:
        record("fail", f"balanced Clojure delimiters: {rel}", "unclosed string or delimiter")
    else:
        record("pass", f"balanced Clojure delimiters: {rel}")


def main() -> int:
    biblioteca_html = require_file("biblioteca-worker/biblioteca-app-clean.html")
    biblioteca_worker = require_file("biblioteca-worker/index.js")
    voice_worker = require_file("numara-voice-worker/index.js")
    voice_readme = require_file("numara-voice-worker/README.md")
    quetzal = require_file("sena-chat/src/sena/chat/quetzal.clj")
    sena_core = require_file("sena-chat/src/sena/chat/core.clj")
    sena_readme = require_file("sena-chat/README.md")

    # Syntax / parse checks that do not need project dependencies.
    run(["node", "--check", "biblioteca-worker/index.js"])
    run(["node", "--check", "numara-voice-worker/index.js"])
    check_json("biblioteca-worker/biblioteca-data.json")
    for rel in [
        "sena-chat/src/sena/chat/api.clj",
        "sena-chat/src/sena/chat/core.clj",
        "sena-chat/src/sena/chat/graph.clj",
        "sena-chat/src/sena/chat/quetzal.clj",
        "sena-chat/src/sena/chat/session.clj",
        "sena-chat/src/sena/chat/voices.clj",
    ]:
        check_balanced_clojure(rel)

    # Biblioteca frontend guardrails.
    require_contains("biblioteca-worker/biblioteca-app-clean.html", biblioteca_html, "https://biblioteca-api.salvadorsena.workers.dev", "Biblioteca uses deployed Worker URL")
    require_contains("biblioteca-worker/biblioteca-app-clean.html", biblioteca_html, "bindCardInteractions", "Biblioteca uses delegated card interactions")
    require_contains("biblioteca-worker/biblioteca-app-clean.html", biblioteca_html, "modern editorial command sheet", "Biblioteca has modern reading-pane styling")
    require_contains("biblioteca-worker/biblioteca-app-clean.html", biblioteca_html, "prefers-reduced-motion", "Biblioteca honors reduced-motion preference")

    # Biblioteca API privacy guardrails.
    require_contains("biblioteca-worker/index.js", biblioteca_worker, "fields.forEach((f, i) => airtableUrl.searchParams.set(`fields[${i}]`, f));", "Pipeline restricts Airtable requested fields")
    require_contains("biblioteca-worker/index.js", biblioteca_worker, "const tasks = (data.records || []).map", "Pipeline flattens Airtable records")
    if "JSON.stringify({ tasks: data.records" in biblioteca_worker:
        record("fail", "Pipeline does not expose raw Airtable records", "raw records serialization found")
    else:
        record("pass", "Pipeline does not expose raw Airtable records")
    require_contains("biblioteca-worker/index.js", biblioteca_worker, "Cache-Control", "Biblioteca volumes response includes cache control")

    # Voice Worker safety guardrails.
    require_contains("numara-voice-worker/index.js", voice_worker, "url.pathname === \"/health\"", "Voice Worker has zero-cost health route")
    require_contains("numara-voice-worker/index.js", voice_worker, "VOICE_ACCESS_TOKEN", "Voice Worker supports token auth")
    require_order("numara-voice-worker/index.js", voice_worker, "isAuthorizedRequest(request, env)", "https://api.openai.com/v1/audio/speech", "Voice Worker authorizes before TTS upstream fetch")
    require_order("numara-voice-worker/index.js", voice_worker, "isAuthorizedRequest(request, env)", "https://api.openai.com/v1/audio/transcriptions", "Voice Worker authorizes before transcription upstream fetch")
    require_contains("numara-voice-worker/index.js", voice_worker, "SUPPORTED_TTS_MODELS", "Voice Worker whitelists TTS models")
    require_contains("numara-voice-worker/index.js", voice_worker, "DEFAULT_MAX_AUDIO_BYTES", "Voice Worker has transcription size cap")
    require_contains("numara-voice-worker/README.md", voice_readme, "file test-aria.mp3", "Voice README documents JSON-vs-audio debug path")

    # Quetzal Core canonicalization guardrails.
    require_contains("sena-chat/src/sena/chat/quetzal.clj", quetzal, "canonical-id :quetzal-core", "Quetzal Core has canonical id")
    require_contains("sena-chat/src/sena/chat/quetzal.clj", quetzal, "\"quetzl\"", "Quetzal Core accepts Quetzl alias")
    require_contains("sena-chat/src/sena/chat/quetzal.clj", quetzal, ":swarm-time", "Quetzal Core records swarm-time principle")
    require_contains("sena-chat/src/sena/chat/quetzal.clj", quetzal, ":memristor-memory", "Quetzal Core records memristor principle")
    require_contains("sena-chat/src/sena/chat/quetzal.clj", quetzal, ":isomorphic-agents", "Quetzal Core records isomorphic-agent principle")
    require_contains("sena-chat/src/sena/chat/core.clj", sena_core, "(= \"/quetzal\" line)", "Sena Chat exposes /quetzal command")
    require_contains("sena-chat/README.md", sena_readme, "Quetzal Core contract", "Sena Chat README documents Quetzal Core")

    # Optional local tools: treat missing binaries as a skip/pass in this dependency-light harness.
    if shutil.which("clj"):
        run(["clj", "-M", "-e", "(require 'sena.chat.quetzal 'sena.chat.core)"], cwd=ROOT / "sena-chat")
    else:
        record("pass", "optional clj require check", "skipped: clj not installed")

    for browser in ["chromium", "chromium-browser", "google-chrome"]:
        if shutil.which(browser):
            record("pass", f"optional browser available: {browser}")
            break
    else:
        record("pass", "optional browser screenshot check", "skipped: no Chromium/Chrome executable installed")

    symbols = {"pass": "✅", "warn": "⚠️", "fail": "❌"}
    for result in results:
        suffix = f" — {result.detail}" if result.detail else ""
        print(f"{symbols[result.status]} {result.name}{suffix}")

    fails = [r for r in results if r.status == "fail"]
    warnings = [r for r in results if r.status == "warn"]
    print(f"\nSummary: {len(results) - len(fails) - len(warnings)} passed, {len(warnings)} warnings, {len(fails)} failures")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
