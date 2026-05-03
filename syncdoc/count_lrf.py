#!/usr/bin/env python3
"""
Count and total the size of .lrf files under a root directory.

Usage:
    python3 count_lrf.py /Volumes/KINGSTON
    python3 count_lrf.py /Volumes/KINGSTON --ext lrf,lrv
    python3 count_lrf.py /Volumes/KINGSTON --list
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

SKIP_DIRS = {
    ".Spotlight-V100",
    ".Trashes",
    ".fseventsd",
    ".TemporaryItems",
    ".DocumentRevisions-V100",
    "System Volume Information",
    "$RECYCLE.BIN",
    ".AppleDouble",
}


def human(n: int) -> str:
    f = float(n)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if f < 1024:
            return f"{f:.1f} {unit}"
        f /= 1024
    return f"{f:.1f} PB"


def main():
    ap = argparse.ArgumentParser(description="Sum the size of files with given extensions.")
    ap.add_argument("root", type=Path, help="Root directory to scan (e.g. /Volumes/KINGSTON)")
    ap.add_argument("--ext", default="lrf",
                    help="Comma-separated extensions, no dots (default: lrf)")
    ap.add_argument("--list", action="store_true",
                    help="Also print every matching file with its size")
    args = ap.parse_args()

    if not args.root.is_dir():
        sys.exit(f"error: {args.root} is not a directory")

    exts = {"." + e.strip().lower().lstrip(".") for e in args.ext.split(",") if e.strip()}

    total_bytes = 0
    total_files = 0
    matches: list[tuple[int, str]] = []

    for dirpath, dirnames, filenames in os.walk(args.root, followlinks=False):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith("._")]
        for name in filenames:
            if name.startswith("._"):
                continue
            if os.path.splitext(name)[1].lower() not in exts:
                continue
            full = os.path.join(dirpath, name)
            try:
                size = os.lstat(full).st_size
            except OSError:
                continue
            total_bytes += size
            total_files += 1
            if args.list:
                matches.append((size, full))

    if args.list:
        for size, path in sorted(matches, reverse=True):
            print(f"  {human(size):>10}  {path}")

    exts_str = ", ".join(sorted(exts))
    print(f"\n{total_files:,} files matching {exts_str} — {human(total_bytes)}")


if __name__ == "__main__":
    main()
