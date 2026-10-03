#!/usr/bin/env python3
"""Pont local vers l'orchestre et la mémoire CX Hub.

Le navigateur public ne peut pas importer ce moteur Python.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

DEFAULT_SRC = os.environ.get("CX_HUB_SRC", "/Users/cedriccarboni/Projects/cx-hub/src")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("prompt", nargs="*")
    parser.add_argument("--remember", action="store_true")
    parser.add_argument("--src", default=DEFAULT_SRC)
    args = parser.parse_args()
    prompt = " ".join(args.prompt).strip() or sys.stdin.read().strip()
    if not prompt:
        print(json.dumps({"ok": False, "error": "prompt vide"}, ensure_ascii=False))
        return 1
    if not os.path.isdir(args.src):
        print(json.dumps({"ok": False, "error": "source CX introuvable", "source": args.src}, ensure_ascii=False))
        return 1
    sys.path.insert(0, args.src)
    from cx_memory import memory_prompt_context, remember_success
    from cx_orchestra import build_orchestra_plan

    plan = build_orchestra_plan(
        prompt,
        available_engines=[],
        health={"cpu_count": os.cpu_count() or 1},
        cloud_enabled=False,
    )
    memory = memory_prompt_context(prompt, max_chars=500)
    if args.remember:
        remember_success(prompt, plan.compact_chain(), project="No[co]de Vibe Designer")
    print(json.dumps({
        "ok": True,
        "engine": "cx-hub",
        "source": args.src,
        "chain": plan.compact_chain(),
        "roles": [item.role.value for item in plan.assignments],
        "memoryChars": len(memory),
        "memoryExcerpt": memory[:240],
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
