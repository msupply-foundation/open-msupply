#!/usr/bin/env bash
#
# check-docs-structure.sh
#
# CI check: ensures every tracked README has a corresponding _index.md
# in docs/content/, and no orphaned _index.md files exist.
#
# Exits with code 1 if any issues are found.
#
# Path transform:
#   src/ directories are stripped from docs paths (code-only convention).
#   e.g. server/service/src/sync/ -> server/service/sync/
#
set -eo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.."; pwd)"
DOCS_CONTENT="$REPO_ROOT/docs/content"

# ── Skip list ─────────────────────────────────────────────────────────
should_skip() {
  case "$1" in
    "README.md") return 0 ;;                           # root README
    ".github/workflows/ACTIONS_README.md") return 0 ;; # not developer docs
    *) return 1 ;;
  esac
}

# ── Helper: compute destination directory ─────────────────────────────
get_dest_dir() {
  local src_dir
  src_dir="$(dirname "$1")"
  echo "$src_dir" | sed 's|/src/|/|g; s|/src$||'
}

# ── Main ──────────────────────────────────────────────────────────────

readmes=$(git -C "$REPO_ROOT" ls-files '*.md' '*.MD' | grep -i 'README\.md$' | sort)

errors=0
checked=0
skipped=0

while IFS= read -r readme; do
  if should_skip "$readme"; then
    skipped=$((skipped + 1))
    continue
  fi

  dest_dir="$(get_dest_dir "$readme")"
  dest_path="$DOCS_CONTENT/$dest_dir/_index.md"

  if [ -f "$dest_path" ]; then
    echo "OK: $readme"
  else
    echo "MISSING: $readme has no corresponding _index.md at ${dest_path#$REPO_ROOT/}"
    errors=$((errors + 1))
  fi
  checked=$((checked + 1))

done <<< "$readmes"

# ── Detect orphaned _index.md files ───────────────────────────────────
expected_files=$(echo "$readmes" | while IFS= read -r readme; do
  should_skip "$readme" && continue
  dest_dir="$(get_dest_dir "$readme")"
  echo "$DOCS_CONTENT/$dest_dir/_index.md"
done | sort)

actual_files=$(find "$DOCS_CONTENT" -name '_index.md' -type f | sort)

orphans=$(comm -23 <(echo "$actual_files") <(echo "$expected_files"))
if [ -n "$orphans" ]; then
  echo ""
  echo "ORPHANED _index.md files (no corresponding README):"
  orphan_count=0
  while IFS= read -r orphan; do
    echo "  ${orphan#$REPO_ROOT/}"
    orphan_count=$((orphan_count + 1))
  done <<< "$orphans"
  errors=$((errors + orphan_count))
fi

echo ""
echo "Summary: $checked checked, $skipped skipped, $errors errors"

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "Check failed."
  exit 1
fi
