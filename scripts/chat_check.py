#!/usr/bin/env python3
"""Sena Chat local readiness check.

Default mode is safe/dry-run. Use --live only when you intentionally want to
spend a tiny Anthropic request to prove the API key and model work.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHAT = ROOT / "sena-chat"
DEFAULT_MODEL = "claude-sonnet-4-6"
ENDPOINT = "https://api.anthropic.com/v1/messages"


def ok(message: str) -> None:
    print(f"✅ {message}")


def warn(message: str) -> None:
    print(f"⚠️ {message}")


def fail(message: str) -> None:
    print(f"❌ {message}")


def run(cmd: list[str], cwd: Path = CHAT) -> bool:
    if shutil.which(cmd[0]) is None:
        warn(f"{cmd[0]} not installed; skipping {' '.join(cmd)}")
        return False
    proc = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if proc.returncode == 0:
        ok(" ".join(cmd))
        return True
    fail(f"{' '.join(cmd)} failed: {(proc.stderr or proc.stdout).strip()}")
    return False


def live_check(model: str) -> bool:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not key:
        fail("ANTHROPIC_API_KEY is not set; export it before --live")
        return False

    body = json.dumps({
        "model": model,
        "max_tokens": 16,
        "system": "Health check. Reply with OK only.",
        "messages": [{"role": "user", "content": "OK?"}],
    }).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        method="POST",
        headers={
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            payload = json.loads(res.read().decode("utf-8"))
        text = payload.get("content", [{}])[0].get("text", "").strip()
        ok(f"Anthropic live check returned: {text or '[empty response]'}")
        return True
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")[:600]
        fail(f"Anthropic live check HTTP {exc.code}: {body_text}")
        return False
    except Exception as exc:  # noqa: BLE001 - report local/network failures clearly
        fail(f"Anthropic live check failed: {exc}")
        return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="make one tiny Anthropic API request")
    args = parser.parse_args()

    model = os.environ.get("ANTHROPIC_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    failures = 0

    if (CHAT / "deps.edn").exists():
        ok("sena-chat/deps.edn exists")
    else:
        fail("sena-chat/deps.edn missing")
        failures += 1

    if shutil.which("java"):
        ok("java is installed")
    else:
        warn("java not installed; install Java 11+ before running Sena Chat")

    if shutil.which("clj"):
        ok("clj is installed")
        if not run(["clj", "-M", "-e", "(require 'sena.chat.core 'sena.chat.quetzal) (println :ok)"]):
            failures += 1
    else:
        warn("clj not installed; install Clojure CLI before running `clj -M:run`")

    if os.environ.get("ANTHROPIC_API_KEY"):
        ok("ANTHROPIC_API_KEY is set (value hidden)")
    else:
        warn("ANTHROPIC_API_KEY is not set; export it before live chat")

    ok(f"Anthropic model: {model}")
    ok("Dry-run complete; use `make chat-live` for one tiny API call")

    if args.live and not live_check(model):
        failures += 1

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
