#!/usr/bin/env python3
"""
Локальный прокси OpenRouter для Grok: ключ из
agents/main/agent/auth-profiles.json (openrouter:default) или OPENROUTER_API_KEY.

Каталог моделей OpenRouter не тянем — только фиксированные id (чат Grok, картинки, Seedream).
Переопределение на сервере: OPENROUTER_GROK_IMAGE_MODEL, OPENROUTER_SEEDREAM_MODEL,
OPENROUTER_SEEDREAM_5_MODEL (вкладка Seedream 5; id может отличаться, пока нет в каталоге OR).

Важно: x-ai/grok-* на OpenRouter не маршрутизируется как image-generation (нет output modality image).
Дефолт картинок — Gemini Image; для Flux и т.п. задайте OPENROUTER_GROK_IMAGE_MODEL.

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

ROOT = Path(
    os.environ.get("OPENCLAW_ROOT") or Path(__file__).resolve().parent.parent
).resolve()
AUTH_PATH = ROOT / "agents/main/agent/auth-profiles.json"
OR_CHAT = "https://openrouter.ai/api/v1/chat/completions"
HTML_PATH = Path(__file__).resolve().parent / "openrouter-grok-chat.html"

HOST = os.environ.get("GROK_CHAT_BIND", "127.0.0.1")
PORT = int(os.environ.get("GROK_CHAT_PORT", "8766"))

# Короткий список текстовых Grok (чат). Без запроса к API.
GROK_CHAT_MODELS: list[dict] = [
    {"id": "x-ai/grok-4.20", "name": "Grok 4.20", "context_length": 2_000_000},
    {"id": "x-ai/grok-4.3", "name": "Grok 4.3", "context_length": 2_000_000},
    {"id": "x-ai/grok-4.1-fast", "name": "Grok 4.1 Fast", "context_length": 2_000_000},
    {"id": "x-ai/grok-4-fast", "name": "Grok 4 Fast", "context_length": 131_072},
    {"id": "x-ai/grok-4", "name": "Grok 4", "context_length": 131_072},
]

# Генерация картинок через chat + modalities (см. OpenRouter image generation). Не x-ai/grok — у них на OR нет image output.
GROK_IMAGE_MODEL = (
    os.environ.get("OPENROUTER_GROK_IMAGE_MODEL", "google/gemini-2.5-flash-image").strip()
)
SEEDREAM_MODEL = (
    os.environ.get("OPENROUTER_SEEDREAM_MODEL", "bytedance-seed/seedream-4.0").strip()
)
# Отдельная вкладка UI: запросы с nsfw: true. Slug уточняйте на openrouter.ai — 5.0 может называться иначе.
SEEDREAM_5_MODEL = (
    os.environ.get("OPENROUTER_SEEDREAM_5_MODEL", "bytedance-seed/seedream-5.0").strip()
)

DEFAULT_CHAT_MODEL = "x-ai/grok-4.20"


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


API_KEY = load_api_key()


def canonical_request_path(raw_path: str) -> str:
    """
    Убрать префикс /grok, если nginx передаёт полный URI (proxy_pass без завершающего /).
    Ожидаемые пути: /, /index.html, /api/config, /api/chat.
    """
    path = raw_path.split("?", 1)[0]
    if path == "/grok":
        return "/"
    prefix = "/grok/"
    if path.startswith(prefix):
        rest = path[len(prefix) :]
        return "/" + rest if rest else "/"
    return path


class Handler(BaseHTTPRequestHandler):
    server_version = "OpenRouterGrokProxy/2.0"

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def do_GET(self) -> None:
        path = canonical_request_path(self.path)
        if path in ("/", "/index.html"):
            if not HTML_PATH.is_file():
                self.send_error(500, "openrouter-grok-chat.html not found")
                return
            body = HTML_PATH.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/api/config":
            cfg = {
                "defaultModel": DEFAULT_CHAT_MODEL,
                "models": GROK_CHAT_MODELS,
                "grokImageModel": GROK_IMAGE_MODEL,
                "seedreamModel": SEEDREAM_MODEL,
                "seedream5Model": SEEDREAM_5_MODEL,
                "openrouterChat": OR_CHAT,
            }
            raw = json.dumps(cfg, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        self.send_error(404)

    def do_POST(self) -> None:
        path = canonical_request_path(self.path)
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
                "X-Title": "OpenClaw Grok",
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
    print(f"Grok: http://{HOST}:{PORT}/")
    print(f"  Chat models (fixed): {len(GROK_CHAT_MODELS)}")
    print(f"  Grok image model: {GROK_IMAGE_MODEL}")
    print(f"  Seedream model: {SEEDREAM_MODEL}")
    print(f"  Seedream 5 tab model: {SEEDREAM_5_MODEL}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
