#!/usr/bin/env python3
"""
Delete all .lrf files under a root directory.

Defaults to a DRY RUN — nothing is deleted unless you pass --yes.

Usage:
    # Dry run: just shows what would be deleted
    python3 delete_lrf.py /Volumes/KINGSTON

    # Actually delete (will prompt for confirmation first)
    python3 delete_lrf.py /Volumes/KINGSTON --yes

    # Other extensions
    python3 delete_lrf.py /Volumes/KINGSTON --ext lrf,lrv --yes
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
    ap = argparse.ArgumentParser(description="Delete files with given extensions under a directory.")
    ap.add_argument("root", type=Path, help="Root directory to scan (e.g. /Volumes/KINGSTON)")
    ap.add_argument("--ext", default="lrf",
                    help="Comma-separated extensions, no dots (default: lrf)")
    ap.add_argument("--yes", action="store_true",
                    help="Actually delete (default is dry run)")
    args = ap.parse_args()

    if not args.root.is_dir():
        sys.exit(f"error: {args.root} is not a directory")

    exts = {"." + e.strip().lower().lstrip(".") for e in args.ext.split(",") if e.strip()}

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
            matches.append((size, full))

    total_bytes = sum(s for s, _ in matches)
    exts_str = ", ".join(sorted(exts))

    if not matches:
        print(f"No files matching {exts_str} found under {args.root}")
        return

    if not args.yes:
        print(f"DRY RUN — would delete {len(matches):,} files matching {exts_str} ({human(total_bytes)}):")
        for size, path in sorted(matches, reverse=True)[:50]:
            print(f"  {human(size):>10}  {path}")
        if len(matches) > 50:
            print(f"  ... and {len(matches) - 50:,} more")
        print(f"\nRe-run with --yes to actually delete.")
        return

    # Live delete: require interactive confirmation.
    prompt = (
        f"About to PERMANENTLY DELETE {len(matches):,} files "
        f"matching {exts_str} ({human(total_bytes)}) under {args.root}.\n"
        f"Type 'DELETE' to confirm: "
    )
    try:
        confirm = input(prompt)
    except EOFError:
        confirm = ""
    if confirm.strip() != "DELETE":
        print("Aborted.")
        sys.exit(1)

    deleted = 0
    freed = 0
    failed: list[tuple[str, str]] = []
    for size, path in matches:
        try:
            os.remove(path)
            deleted += 1
            freed += size
        except OSError as e:
            failed.append((path, str(e)))

    print(f"\nDeleted {deleted:,} files, freed {human(freed)}")
    if failed:
        print(f"Failed to delete {len(failed)} files:")
        for path, err in failed[:20]:
            print(f"  {path}: {err}")
        if len(failed) > 20:
            print(f"  ... and {len(failed) - 20} more")


if __name__ == "__main__":
    main()
