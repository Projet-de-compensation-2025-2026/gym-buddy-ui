#!/usr/bin/env python3
"""Prove Release writes package.json and never auto-picks 1.0.0."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SYNC = ROOT / ".github/scripts/ci/sync_package_version.py"
NEXT = ROOT / ".github/scripts/ci/next_version.py"
RELEASE = ROOT / ".github/workflows/release.yml"
PACKAGE = ROOT / "package.json"


def fail(msg: str) -> None:
    print(f"TEST FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def run(
    args: list[str],
    *,
    cwd: Path,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    return subprocess.run(args, cwd=cwd, env=merged, text=True, capture_output=True)


def git(args: list[str], cwd: Path) -> None:
    subprocess.check_call(
        ["git", *args],
        cwd=cwd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def repo_with_tag(tag: str) -> Path:
    tmp = Path(tempfile.mkdtemp())
    git(["init"], tmp)
    git(["config", "user.email", "ci@example.com"], tmp)
    git(["config", "user.name", "CI"], tmp)
    (tmp / "README").write_text("x\n", encoding="utf-8")
    git(["add", "README"], tmp)
    git(["commit", "-m", "init"], tmp)
    git(["tag", "-a", tag, "-m", tag], tmp)
    return tmp


def test_release_yml_wires_sync() -> None:
    text = RELEASE.read_text(encoding="utf-8")
    if "sync_package_version.py" not in text:
        fail("release.yml does not run sync_package_version.py")
    if "prepare_changelog.py" not in text:
        fail("release.yml missing prepare_changelog.py")
    compute_at = text.find("next_version.py")
    sync_at = text.find("sync_package_version.py")
    tag_at = text.find('git tag -a "v${VERSION}"')
    if compute_at < 0 or sync_at < 0 or tag_at < 0 or not (compute_at < sync_at < tag_at):
        fail("release.yml must compute version, write package.json, then tag")


def test_package_json_stays_0yz() -> None:
    pkg = json.loads(PACKAGE.read_text(encoding="utf-8"))
    ver = str(pkg.get("version", ""))
    if not ver.startswith("0."):
        fail(f"package.json version {ver!r} must stay 0.y.z (do not invent 1.0.0)")


def test_sync_writes_package_json() -> None:
    tmp = Path(tempfile.mkdtemp())
    (tmp / "package.json").write_text(
        json.dumps({"name": "gym-buddy-ui", "version": "0.1.0"}, indent=2) + "\n",
        encoding="utf-8",
    )
    result = run([sys.executable, str(SYNC), "0.1.2"], cwd=tmp)
    if result.returncode != 0:
        fail(f"sync_package_version.py 0.1.2 failed: {result.stderr}")
    pkg = json.loads((tmp / "package.json").read_text(encoding="utf-8"))
    if pkg["version"] != "0.1.2":
        fail(f"expected package.json 0.1.2, got {pkg['version']!r}")
    bad = run([sys.executable, str(SYNC), "1.0.0-rc.1"], cwd=tmp)
    if bad.returncode == 0:
        fail("sync_package_version.py accepted a non X.Y.Z version")


def test_auto_bump_never_picks_1_0_0() -> None:
    from_zero = repo_with_tag("v0.1.1")
    major = run(
        [sys.executable, str(NEXT)],
        cwd=from_zero,
        env={"INPUT_VERSION": "", "INPUT_BUMP": "major"},
    )
    if major.returncode != 0:
        fail(f"major bump from 0.1.1 failed: {major.stderr}")
    if major.stdout.strip() != "0.2.0":
        fail(f"major bump from 0.1.1 must stay 0.y.z, got {major.stdout!r}")

    after_ship = repo_with_tag("v1.0.0")
    auto = run(
        [sys.executable, str(NEXT)],
        cwd=after_ship,
        env={"INPUT_VERSION": "", "INPUT_BUMP": "patch"},
    )
    if auto.returncode == 0:
        fail("auto bump from 1.0.0 must refuse (never choose 1.0.0+ automatically)")
    if "Refusing to publish 1.0.0" not in auto.stderr:
        fail(f"expected 1.0.0 refuse message, got {auto.stderr!r}")

    manual = run(
        [sys.executable, str(NEXT)],
        cwd=from_zero,
        env={"INPUT_VERSION": "1.0.0", "INPUT_BUMP": "auto"},
    )
    if manual.returncode != 0 or manual.stdout.strip() != "1.0.0":
        fail(f"manual version=1.0.0 must be allowed for the academic ship: {manual.stderr}")


def main() -> None:
    for required in (SYNC, NEXT, RELEASE, PACKAGE):
        if not required.is_file():
            fail(f"missing {required}")
    test_release_yml_wires_sync()
    test_package_json_stays_0yz()
    test_sync_writes_package_json()
    test_auto_bump_never_picks_1_0_0()
    print("TEST OK: Release writes package.json; auto bump never picks 1.0.0")


if __name__ == "__main__":
    main()
