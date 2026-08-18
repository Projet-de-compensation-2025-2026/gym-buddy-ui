#!/usr/bin/env python3
"""Write the Release SemVer into package.json.

Humans do not hand-edit that version number. The Release workflow computes
X.Y.Z (next_version.py) and this script writes it before the tag.

UI-only: do not touch OpenAPI info.version (that is gym-buddy-openapi).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: sync_package_version.py X.Y.Z")
    version = sys.argv[1]
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        sys.exit(f"invalid version: {version}")

    pkg_path = Path("package.json")
    if not pkg_path.is_file():
        sys.exit("package.json not found")
    pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
    pkg["version"] = version
    pkg_path.write_text(json.dumps(pkg, indent=2) + "\n", encoding="utf-8")
    print(f"Synced package.json version to {version}")


if __name__ == "__main__":
    main()
