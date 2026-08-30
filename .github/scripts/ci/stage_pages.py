#!/usr/bin/env python3
"""Stage Angular production builds as a GitHub Pages tree.

GitHub Pages has no SPA rewrite and only one custom 404 (site-root 404.html).
Copy each known client route to path/index.html and path.html so a cold GET is
HTTP 200. Keep 404.html as the unknown-path / parameterized-route fallback.
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

# Static member paths (no :param). Parameterized /events/:id, /messages/:id,
# /posts/:id, /u/:handle still use site-root 404.html.
MEMBER_ROUTES = (
    "register",
    "login",
    "events",
    "events/new",
    "friends",
    "friends/suggestions",
    "search",
    "messages",
    "inbox",
    "suggestions",
    "settings",
    "settings/profile",
    "settings/privacy",
)

ADMIN_ROUTES = (
    "login",
    "users",
    "content",
    "reports",
    "media",
    "fixtures",
    "audit",
)

SKIP_FROM_MEMBER = {"admin", "_site"}


def fail(msg: str) -> None:
    print(f"stage_pages: {msg}", file=sys.stderr)
    sys.exit(1)


def member_dist(root: Path) -> Path:
    env = os.environ.get("MEMBER_DIST")
    if env:
        path = Path(env)
        if not (path / "index.html").is_file():
            fail(f"MEMBER_DIST has no index.html: {path}")
        return path
    for candidate in (
        root / "dist" / "gym-buddy-ui" / "browser",
        root / "dist" / "browser",
        root / "dist",
    ):
        if (candidate / "index.html").is_file():
            return candidate
    fail("no member dist/index.html (run ng build gym-buddy-ui)")


def admin_dist(root: Path) -> Path:
    env = os.environ.get("ADMIN_DIST")
    if env:
        path = Path(env)
        if not (path / "index.html").is_file():
            fail(f"ADMIN_DIST has no index.html: {path}")
        return path
    for candidate in (root / "dist-admin", root / "dist" / "admin"):
        if (candidate / "index.html").is_file():
            return candidate
    fail("no admin dist-admin/index.html (run ng build gym-buddy-admin)")


def copy_tree(src: Path, dest: Path, skip: set[str] | None = None) -> None:
    ignore = skip or set()
    dest.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        if item.name in ignore:
            continue
        target = dest / item.name
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)


def materialize(index: Path, dest_root: Path, route: str) -> None:
    """Write route/index.html and route.html (Pages pretty URL + trailing slash)."""
    html = index.read_bytes()
    folder = dest_root.joinpath(*route.split("/"))
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "index.html").write_bytes(html)
    (folder.parent / f"{folder.name}.html").write_bytes(html)


def require_marker(path: Path, needle: str, absent: str) -> None:
    body = path.read_text(encoding="utf-8")
    if needle not in body:
        fail(f"{path} missing {needle}")
    if absent in body:
        fail(f"{path} unexpectedly contains {absent}")


def stage(root: Path, dest: Path) -> None:
    member = member_dist(root)
    admin = admin_dist(root)
    dest = dest.resolve()
    member_r = member.resolve()
    admin_r = admin.resolve()
    if dest in (member_r, admin_r) or dest == Path("/"):
        fail("dest must not be a dist directory")
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    copy_tree(member, dest, skip=SKIP_FROM_MEMBER)
    member_index = dest / "index.html"
    if not member_index.is_file():
        fail("member index.html missing after copy")
    shutil.copy2(member_index, dest / "404.html")
    for route in MEMBER_ROUTES:
        materialize(member_index, dest, route)

    admin_dest = dest / "admin"
    if admin_dest.exists():
        shutil.rmtree(admin_dest)
    copy_tree(admin, admin_dest)
    admin_index = admin_dest / "index.html"
    if not admin_index.is_file():
        fail("admin index.html missing after copy")
    shutil.copy2(admin_index, admin_dest / "404.html")
    for route in ADMIN_ROUTES:
        materialize(admin_index, admin_dest, route)

    (dest / ".nojekyll").write_text("", encoding="utf-8")

    require_marker(dest / "404.html", "<app-root>", "<admin-root>")
    require_marker(dest / "login" / "index.html", "<app-root>", "<admin-root>")
    require_marker(dest / "login.html", "<app-root>", "<admin-root>")
    require_marker(admin_dest / "login" / "index.html", "<admin-root>", "<app-root>")
    require_marker(admin_dest / "login.html", "<admin-root>", "<app-root>")
    require_marker(admin_dest / "index.html", "<admin-root>", "<app-root>")


def main(argv: list[str]) -> None:
    dest_name = argv[1] if len(argv) > 1 else "_site"
    dest = Path(dest_name)
    if not dest.is_absolute():
        dest = ROOT / dest
    stage(ROOT, dest)
    print(f"stage_pages: wrote {dest}")


if __name__ == "__main__":
    main(sys.argv)
