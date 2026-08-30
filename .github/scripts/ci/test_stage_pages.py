#!/usr/bin/env python3
"""Prove stage_pages.py copies member and admin SPA files onto known routes."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / ".github/scripts/ci"))

from stage_pages import ADMIN_ROUTES, MEMBER_ROUTES, stage  # noqa: E402


def fail(msg: str) -> None:
    print(f"TEST FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        member = tmp_path / "member"
        admin = tmp_path / "admin"
        dest = tmp_path / "site"
        write(
            member / "index.html",
            "<html><head><title>Gym Buddy</title>"
            '<base href="/gym-buddy-ui/"></head>'
            "<body><app-root></app-root></body></html>\n",
        )
        write(member / "main.js", "member();\n")
        write(
            member / "admin" / "index.html",
            "<html><body><app-root>stale nested copy</app-root></body></html>\n",
        )
        write(
            admin / "index.html",
            "<html><head><title>Gym Buddy Admin</title>"
            '<base href="/gym-buddy-ui/admin/"></head>'
            "<body><admin-root></admin-root></body></html>\n",
        )
        write(admin / "main.js", "admin();\n")
        os.environ["MEMBER_DIST"] = str(member)
        os.environ["ADMIN_DIST"] = str(admin)
        stage(ROOT, dest)

        member_index = (dest / "index.html").read_text(encoding="utf-8")
        if "<app-root>" not in member_index or "<admin-root>" in member_index:
            fail("dest/index.html is not the member SPA")
        fallback = (dest / "404.html").read_text(encoding="utf-8")
        if "<app-root>" not in fallback or "<admin-root>" in fallback:
            fail("404.html must stay the member SPA")
        if (dest / "main.js").read_text(encoding="utf-8") != "member();\n":
            fail("member assets were not copied")
        if (dest / "admin" / "main.js").read_text(encoding="utf-8") != "admin();\n":
            fail("admin assets were not copied")
        if "stale nested copy" in (dest / "admin" / "index.html").read_text(
            encoding="utf-8"
        ):
            fail("member dist/admin leaked into the admin bundle")

        for route in MEMBER_ROUTES:
            folder = dest.joinpath(*route.split("/"))
            for path in (folder / "index.html", folder.parent / f"{folder.name}.html"):
                body = path.read_text(encoding="utf-8")
                if "<app-root>" not in body or "<admin-root>" in body:
                    fail(f"{path} is not the member SPA")

        for route in ADMIN_ROUTES:
            folder = (dest / "admin").joinpath(*route.split("/"))
            for path in (folder / "index.html", folder.parent / f"{folder.name}.html"):
                body = path.read_text(encoding="utf-8")
                if "<admin-root>" not in body or "<app-root>" in body:
                    fail(f"{path} is not the admin SPA")
                if "Gym Buddy Admin" not in body:
                    fail(f"{path} missing Gym Buddy Admin title")
                if 'base href="/gym-buddy-ui/admin/"' not in body:
                    fail(f"{path} missing admin base href")

        admin_404 = (dest / "admin" / "404.html").read_text(encoding="utf-8")
        if "<admin-root>" not in admin_404 or "<app-root>" in admin_404:
            fail("admin/404.html is not the admin SPA")
        if not (dest / ".nojekyll").is_file():
            fail("missing .nojekyll")

    print("TEST OK: stage_pages.py materializes member and admin routes")


if __name__ == "__main__":
    main()
