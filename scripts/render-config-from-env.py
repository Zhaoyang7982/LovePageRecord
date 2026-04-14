#!/usr/bin/env python3
"""从 love-record/app.env 读取变量，生成 love-record/js/config.js"""
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_PATH = os.path.join(ROOT, "app.env")
OUT_PATH = os.path.join(ROOT, "js", "config.js")


def parse_env_line(line):
    line = line.strip()
    if not line or line.startswith("#"):
        return None
    if "=" not in line:
        return None
    key, val = line.split("=", 1)
    key = key.strip()
    val = val.strip()
    if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
        val = val[1:-1]
    return key, val


def load_env(path):
    out = {}
    if not os.path.isfile(path):
        return out
    with open(path, encoding="utf-8") as f:
        for line in f:
            p = parse_env_line(line)
            if p:
                out[p[0]] = p[1]
    return out


def main():
    raw = load_env(ENV_PATH)
    cfg = {
        "SUPABASE_URL": (raw.get("SUPABASE_URL") or "").strip(),
        "SUPABASE_ANON_KEY": (raw.get("SUPABASE_ANON_KEY") or "").strip(),
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("window.__LOVE_RECORD_CONFIG__ = ")
        f.write(json.dumps(cfg, ensure_ascii=False))
        f.write(";\n")
    print("Wrote", OUT_PATH, file=sys.stderr)


if __name__ == "__main__":
    main()
