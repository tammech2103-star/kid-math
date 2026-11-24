#!/usr/bin/env python3
"""Minimal in-memory ROM relay for Kid Math Retro netplay.

This is NOT a Socket.IO signaling server. Use EmulatorJS-Netplay (Rust) or
another compatible server for signaling. This service only stores a ROM
temporarily in RAM so a host can send it to a guest.

Run:
    python server/rom_relay.py

Environment:
    ROM_RELAY_HOST=0.0.0.0
    ROM_RELAY_PORT=8790
    ROM_RELAY_TTL_SECONDS=900
    ROM_RELAY_MAX_BYTES=157286400
"""
from __future__ import annotations

import base64
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HOST = os.environ.get("ROM_RELAY_HOST", "0.0.0.0")
PORT = int(os.environ.get("ROM_RELAY_PORT") or os.environ.get("PORT") or "8790")
TTL = int(os.environ.get("ROM_RELAY_TTL_SECONDS", "900"))
MAX_BYTES = int(os.environ.get("ROM_RELAY_MAX_BYTES", str(150 * 1024 * 1024)))

STORE = {}
LOCK = threading.Lock()


def cleanup():
    now = time.time()
    with LOCK:
        expired = [k for k, v in STORE.items() if v["expires"] <= now]
        for k in expired:
            del STORE[k]


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Room-Password")

    def _json(self, status, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self._cors()
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        cleanup()
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) != 3 or parts[0] != "api" or parts[1] != "rom":
            self._json(404, {"error": "not found"})
            return

        code = parts[2]
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > MAX_BYTES * 4 // 3 + 1024:
            self._json(413, {"error": "payload too large"})
            return

        try:
            raw = self.rfile.read(length)
            body = json.loads(raw.decode("utf-8"))
        except Exception:
            self._json(400, {"error": "invalid json"})
            return

        rom_b64 = body.get("romBase64")
        if not isinstance(rom_b64, str) or not rom_b64:
            self._json(400, {"error": "romBase64 required"})
            return

        try:
            rom_bytes = base64.b64decode(rom_b64, validate=True)
        except Exception:
            self._json(400, {"error": "invalid base64"})
            return

        if len(rom_bytes) > MAX_BYTES:
            self._json(413, {"error": "ROM too large"})
            return

        password = self.headers.get("X-Room-Password", "")
        entry = {
            "romBase64": rom_b64,
            "fileName": str(body.get("fileName") or "rom.bin"),
            "core": body.get("core"),
            "gameId": body.get("gameId"),
            "password": password,
            "expires": time.time() + TTL,
        }
        with LOCK:
            STORE[code] = entry

        self._json(200, {"ok": True, "expiresIn": TTL})

    def do_GET(self):
        cleanup()
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) != 3 or parts[0] != "api" or parts[1] != "rom":
            self._json(404, {"error": "not found"})
            return

        code = parts[2]
        qs = parse_qs(parsed.query)
        password = (qs.get("password") or [""])[0]

        with LOCK:
            entry = STORE.get(code)

        if not entry or entry["expires"] <= time.time():
            self._json(404, {"error": "room not found or expired"})
            return
        if entry["password"] != password:
            self._json(403, {"error": "wrong password"})
            return

        self._json(200, {
            "romBase64": entry["romBase64"],
            "fileName": entry["fileName"],
            "core": entry["core"],
            "gameId": entry["gameId"],
        })

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"ROM relay listening on http://{HOST}:{PORT} (TTL={TTL}s)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
PY