#!/usr/bin/env python3
"""
Локальный прокси OpenRouter для чата с Grok: ключ читается из
agents/main/agent/auth-profiles.json (профиль openrouter:default) или
переменной OPENROUTER_API_KEY. Список моделей подтягивается с OpenRouter.

Запуск: python3 openrouter_grok_proxy.py
Открыть: http://127.0.0.1:8766/
"""
from __future__ import annotations

import json
import os
import ssl
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

# Корень openclaw (где лежит agents/main/...). По умолчанию — родитель каталога workspace.
ROOT = Path(
    os.environ.get("OPENCLAW_ROOT") or Path(__file__).resolve().parent.parent
).resolve()
AUTH_PATH = ROOT / "agents/main/agent/auth-profiles.json"
OR_MODELS = "https://openrouter.ai/api/v1/models"
OR_CHAT = "https://openrouter.ai/api/v1/chat/completions"
HTML_PATH = Path(__file__).resolve().parent / "openrouter-grok-chat.html"

HOST = os.environ.get("GROK_CHAT_BIND", "127.0.0.1")
PORT = int(os.environ.get("GROK_CHAT_PORT", "8766"))


def load_api_key() -> str:
    env = (os.environ.get("OPENROUTER_API_KEY") or "").strip()
    if env:
        return env
    if not AUTH_PATH.is_file():
        sys.exit(f"Нет ключа: задайте OPENROUTER_API_KEY или создайте {AUTH_PATH}")
    data = json.loads(AUTH_PATH.read_text(encoding="utf-8"))
    prof = data.get("profiles", {}).get("openrouter:default", {})
    key = (prof.get("key") or "").strip()
    if not key:
        sys.exit("В auth-profiles.json нет openrouter:default.key")
    return key


def ssl_ctx() -> ssl.SSLContext:
    return ssl.create_default_context()


def openrouter_get_models(api_key: str) -> list[dict]:
    req = Request(OR_MODELS, headers={"Authorization": f"Bearer {api_key}"})
    with urlopen(req, context=ssl_ctx(), timeout=120) as r:
        data = json.load(r)
    rows: list[dict] = []
    for m in data.get("data", []):
        mid = m.get("id") or ""
        if not mid.startswith("x-ai/grok"):
            continue
        rows.append(
            {
                "id": mid,
                "name": m.get("name", mid),
                "context_length": m.get("context_length") or 0,
            }
        )
    rows.sort(key=lambda x: (x["context_length"], x["id"]), reverse=True)
    return rows


def pick_default_model(models: list[dict]) -> str:
    ids = {m["id"] for m in models}
    preferred = [
        "x-ai/grok-4.20",
        "x-ai/grok-4.3",
        "x-ai/grok-4.1-fast",
        "x-ai/grok-4-fast",
        "x-ai/grok-4",
    ]
    for p in preferred:
        if p in ids:
            return p
    return models[0]["id"] if models else "x-ai/grok-4.20"


API_KEY = load_api_key()
try:
    GROK_MODELS = openrouter_get_models(API_KEY)
except (URLError, HTTPError, TimeoutError, OSError) as e:
    sys.exit(f"Не удалось загрузить модели OpenRouter: {e}")

DEFAULT_MODEL = pick_default_model(GROK_MODELS)


class Handler(BaseHTTPRequestHandler):
    server_version = "OpenRouterGrokProxy/1.0"

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html"):
            if not HTML_PATH.is_file():
                self.send_error(500, "openrouter-grok-chat.html not found")
                return
            body = HTML_PATH.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/api/config":
            cfg = {
                "defaultModel": DEFAULT_MODEL,
                "models": GROK_MODELS,
                "openrouterChat": OR_CHAT,
            }
            raw = json.dumps(cfg, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        self.send_error(404)

    def do_POST(self) -> None:
        path = self.path.split("?", 1)[0]
        if path != "/api/chat":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0 or length > 50 * 1024 * 1024:
            self.send_error(400, "Invalid Content-Length")
            return
        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return
        if not isinstance(payload, dict):
            self.send_error(400, "Body must be object")
            return
        payload.setdefault("stream", True)
        out = json.dumps(payload).encode("utf-8")
        req = Request(
            OR_CHAT,
            data=out,
            method="POST",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": f"http://{HOST}:{PORT}",
                "X-Title": "OpenClaw Grok Chat",
            },
        )
        try:
            upstream = urlopen(req, context=ssl_ctx(), timeout=600)
        except HTTPError as e:
            err_body = e.read()
            self.send_response(e.code)
            ct = e.headers.get("Content-Type", "application/json")
            self.send_header("Content-Type", ct)
            self.send_header("Content-Length", str(len(err_body)))
            self.end_headers()
            self.wfile.write(err_body)
            return
        except URLError as e:
            msg = json.dumps({"error": {"message": str(e.reason or e)}}).encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)
            return
        try:
            self.send_response(200)
            ct = upstream.headers.get("Content-Type", "text/event-stream")
            self.send_header("Content-Type", ct)
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "close")
            self.end_headers()
            while True:
                chunk = upstream.read(8192)
                if not chunk:
                    break
                self.wfile.write(chunk)
                try:
                    self.wfile.flush()
                except BrokenPipeError:
                    break
        finally:
            upstream.close()


class ReuseHTTPServer(HTTPServer):
    allow_reuse_address = True


def main() -> None:
    httpd = ReuseHTTPServer((HOST, PORT), Handler)
    print(f"Grok chat: http://{HOST}:{PORT}/")
    print(f"Default model: {DEFAULT_MODEL} ({len(GROK_MODELS)} Grok models loaded)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
