#!/usr/bin/env python3
"""
从仓库根下的 love-record/app.env 与当前进程环境变量生成 love-record/js/config.local.js。
环境变量优先级高于 app.env，便于 CI 注入密钥（勿将 app.env、config.local.js 提交到 Git）。
"""
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_PATH = os.path.join(ROOT, "app.env")
OUT_PATH = os.path.join(ROOT, "js", "config.local.js")


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


def getenv_merged(raw, key, default=""):
    v = os.environ.get(key)
    if v is not None and str(v).strip() != "":
        return str(v).strip()
    return (raw.get(key) or default).strip()


def js_escape(val):
    return json.dumps(val, ensure_ascii=False)


def main():
    raw = load_env(ENV_PATH)
    merged = {
        "SUPABASE_URL": getenv_merged(raw, "SUPABASE_URL"),
        "SUPABASE_ANON_KEY": getenv_merged(raw, "SUPABASE_ANON_KEY"),
        "ACCOUNTS": {
            "female": {
                "username": getenv_merged(raw, "FEMALE_USERNAME"),
                "password": getenv_merged(raw, "FEMALE_PASSWORD"),
            },
            "male": {
                "username": getenv_merged(raw, "MALE_USERNAME"),
                "password": getenv_merged(raw, "MALE_PASSWORD"),
            },
        },
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("(function () {\n")
        f.write("  var g = window.__LOVE_RECORD_CONFIG__;\n")
        f.write(
            "  if (!g) { window.__LOVE_RECORD_CONFIG__ = {}; g = window.__LOVE_RECORD_CONFIG__; }\n"
        )
        f.write("  g.SUPABASE_URL = %s;\n" % js_escape(merged["SUPABASE_URL"]))
        f.write("  g.SUPABASE_ANON_KEY = %s;\n" % js_escape(merged["SUPABASE_ANON_KEY"]))
        f.write(
            "  g.ACCOUNTS = %s;\n" % json.dumps(merged["ACCOUNTS"], ensure_ascii=False)
        )
        f.write("})();\n")
    print("Wrote", OUT_PATH, file=sys.stderr)


if __name__ == "__main__":
    main()
