#!/usr/bin/env python3
"""
Find duplicate files under a root directory by file name.

Two files are considered duplicates if they have the same base name
(case-insensitive). Content is not compared.

Usage:
    python3 find_duplicates.py /Volumes/KINGSTON
    python3 find_duplicates.py /Volumes/KINGSTON --min-size 1048576
    python3 find_duplicates.py /Volumes/KINGSTON --output dupes.txt
"""

from __future__ import annotations

import argparse
import os
import sys
from collections import defaultdict
from pathlib import Path

# Names to skip entirely (macOS / Windows / drive metadata).
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

# File names to skip.
SKIP_FILES = {".DS_Store", "Thumbs.db", "desktop.ini"}


def human(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} PB"


def walk_files(root: Path, min_size: int):
    """Yield (path, size) for every regular file under root."""
    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        # Prune skip directories in-place so os.walk doesn't descend.
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith("._")]
        for name in filenames:
            if name in SKIP_FILES or name.startswith("._"):
                continue
            full = os.path.join(dirpath, name)
            try:
                st = os.lstat(full)
            except OSError:
                continue
            # Regular file only (skip symlinks, devices, etc.)
            if not (st.st_mode & 0o170000) == 0o100000:
                continue
            if st.st_size < min_size:
                continue
            yield full, st.st_size


def scan(root: Path, min_size: int):
    """Walk root and return (by_name, biggest)."""
    print(f"Scanning {root} ...", file=sys.stderr)
    by_name: dict[str, list[tuple[str, int]]] = defaultdict(list)
    biggest: list[tuple[int, str]] = []   # kept sorted ascending, len <= 20
    total_files = 0
    for path, size in walk_files(root, min_size):
        key = os.path.basename(path).lower()
        by_name[key].append((path, size))
        total_files += 1
        if len(biggest) < 20:
            biggest.append((size, path))
            biggest.sort()
        elif size > biggest[0][0]:
            biggest[0] = (size, path)
            biggest.sort()
        if total_files % 5000 == 0:
            print(f"  scanned {total_files:,} files", file=sys.stderr)
    print(f"  total files: {total_files:,}", file=sys.stderr)

    dupe_groups = [entries for entries in by_name.values() if len(entries) > 1]
    return dupe_groups, biggest


def main():
    ap = argparse.ArgumentParser(description="Find duplicate files (by name) under a directory.")
    ap.add_argument("root", type=Path, help="Root directory to scan (e.g. /Volumes/KINGSTON)")
    ap.add_argument("--min-size", type=int, default=1,
                    help="Ignore files smaller than this many bytes (default: 1)")
    ap.add_argument("--output", type=Path, default=None,
                    help="Write report to this file (default: stdout)")
    args = ap.parse_args()

    if not args.root.is_dir():
        sys.exit(f"error: {args.root} is not a directory")

    groups, biggest = scan(args.root, args.min_size)

    # Sort by total bytes across the group, biggest first.
    groups.sort(key=lambda entries: sum(s for _, s in entries), reverse=True)

    out = open(args.output, "w") if args.output else sys.stdout

    out.write("# Top 20 biggest files\n")
    for size, path in sorted(biggest, reverse=True):
        out.write(f"  {human(size):>10}  {path}\n")

    out.write("\n# Duplicate file names (largest total size first)\n")
    total_groups = 0
    total_extra_bytes = 0
    for entries in groups:
        total_groups += 1
        sizes = [s for _, s in entries]
        # "Reclaimable if all but largest deleted" — treat as a hint only,
        # since same-name files may differ in content.
        extra = sum(sizes) - max(sizes)
        total_extra_bytes += extra
        name = os.path.basename(entries[0][0])
        out.write(f"\n# {name}  ({len(entries)} files, total {human(sum(sizes))})\n")
        for path, size in sorted(entries):
            out.write(f"  {human(size):>10}  {path}\n")

    summary = (
        f"\n# Summary: {total_groups:,} name-collision groups, "
        f"~{human(total_extra_bytes)} if you kept only the largest of each\n"
    )
    out.write(summary)
    if args.output:
        out.close()
        print(summary.strip(), file=sys.stderr)


if __name__ == "__main__":
    main()
