#!/usr/bin/env python3
"""Tạo gói ZIP sạch để upload GitHub cho Render.

Gói gồm source/runtime cần thiết, bỏ ảnh QA nặng và thư mục build public/.
Chạy:
    python tools/pack_deploy.py
"""
from __future__ import annotations

import sys
import zipfile
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "deploy" / "kid-math-render.zip"

ROOT_FILES = [
    "index.html",
    "render.yaml",
    "README.md",
    "DEPLOY-RENDER.md",
    ".gitignore",
]
DIRS = ["css", "js", "Asset", "design", "docs", "tests", "tools"]
SKIP_PARTS = {"__pycache__", ".playwright", "public", "deploy"}
PRODUCTION_FILES = [
    "production/qa/test-plan.md",
    "production/qa/smoke-report.md",
    "production/qa/code-review.md",
    "production/qa/screenshots/02-home.png",
    "production/qa/screenshots/14-render-build.png",
    "production/session-state/active.md",
    "production/session-logs/2026-11-20-build-log.md",
]


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        OUT.unlink()

    files: list[Path] = []
    for name in ROOT_FILES:
        path = ROOT / name
        if path.is_file():
            files.append(path)
    for name in DIRS:
        base = ROOT / name
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            if any(part in SKIP_PARTS for part in path.relative_to(ROOT).parts):
                continue
            if path.suffix == ".pyc":
                continue
            files.append(path)
    for name in PRODUCTION_FILES:
        path = ROOT / name
        if path.is_file():
            files.append(path)

    files = sorted(set(files))
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            archive.write(path, path.relative_to(ROOT).as_posix())

    size = OUT.stat().st_size
    print(f"Đã tạo {OUT} ({len(files)} file, {size / 1024:.1f} KB)")
    print("Upload nội dung ZIP lên GitHub, giữ render.yaml ở gốc repo.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
