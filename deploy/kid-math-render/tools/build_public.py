#!/usr/bin/env python3
"""Đóng gói bản tĩnh vào public/ để deploy (Render, Netlify, Nginx...).

Chỉ copy các file runtime: index.html, css/, js/, Asset/.
Không copy tests/, docs/, production/ — những thứ đó không cần trên web.

Chạy:
    python tools/build_public.py
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public"
DIRS = ["css", "js", "Asset"]
REQUIRED = [
    "index.html",
    "css/tokens.css",
    "css/app.css",
    "js/app.js",
    "Asset/car1.webp",
]


def main() -> int:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    shutil.copy2(ROOT / "index.html", OUT / "index.html")
    for name in DIRS:
        shutil.copytree(ROOT / name, OUT / name)

    missing = [rel for rel in REQUIRED if not (OUT / rel).is_file()]
    if missing:
        print("Thiếu file bắt buộc: " + ", ".join(missing), file=sys.stderr)
        return 1

    total = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
    print(f"Đã tạo {OUT}")
    print(f"{len(list(OUT.rglob('*')))} mục, {total / 1024:.1f} KB")
    print("Kiểm tra nhanh: python -m http.server 8766 --bind 127.0.0.1 --directory public")
    return 0


if __name__ == "__main__":
    sys.exit(main())
