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
    docs/themes/*) return 0 ;;                         # theme vendored files
    docs/themes/*) return 0 ;;                         # theme vendored files
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

# ── Helper: check if an _index.md has source = "docs" in frontmatter ─
is_docs_source() {
  # Reads the TOML frontmatter (between +++ delimiters) and checks for source = "docs"
  awk '/^\+\+\+$/{n++; next} n==1' "$1" | grep -q '^source[[:space:]]*=[[:space:]]*"docs"'
}

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
  orphan_count=0
  while IFS= read -r orphan; do
    if ! is_docs_source "$orphan"; then
      echo "ORPHANED: ${orphan#$REPO_ROOT/} (no corresponding README — add source = \"docs\" to frontmatter if this is standalone content)"
      orphan_count=$((orphan_count + 1))
    fi
  done <<< "$orphans"
  errors=$((errors + orphan_count))
fi

echo ""
echo "Summary: $checked checked, $skipped skipped, $errors errors"

# ── Bare HTML tags that break rendering ───────────────────────────
# Tags like <script> or <style> outside of backticks/code blocks are
# rendered as real HTML by Zola, which breaks the page DOM and is
# an XSS risk (arbitrary JS execution for site visitors).
echo ""
echo "Checking for bare HTML tags in markdown..."
bare_html_errors=0

while IFS= read -r mdfile; do
  # Strip fenced code blocks (``` ... ```) and inline code (`...`)
  stripped=$(sed '/^```/,/^```/d' "$mdfile" | sed 's/`[^`]*`//g')

  # Check 1: dangerous HTML tags rendered as real DOM elements
  result=$(echo "$stripped" | grep -n '<\(script\|style\|iframe\|object\|embed\|form\|link\|img\|svg\)[^a-zA-Z]' || true)
  if [ -n "$result" ]; then
    while IFS= read -r line; do
      echo "BARE HTML: ${mdfile#$REPO_ROOT/}:$line"
      bare_html_errors=$((bare_html_errors + 1))
    done <<< "$result"
  fi

  # Check 2: javascript: URLs in markdown links — [text](javascript:...)
  result=$(echo "$stripped" | grep -in '\](javascript:' || true)
  if [ -n "$result" ]; then
    while IFS= read -r line; do
      echo "JS URL: ${mdfile#$REPO_ROOT/}:$line"
      bare_html_errors=$((bare_html_errors + 1))
    done <<< "$result"
  fi

  # Check 3: event handler attributes (onclick, onerror, onload, etc.)
  result=$(echo "$stripped" | grep -n ' on[a-z]*=' || true)
  if [ -n "$result" ]; then
    while IFS= read -r line; do
      echo "EVENT HANDLER: ${mdfile#$REPO_ROOT/}:$line"
      bare_html_errors=$((bare_html_errors + 1))
    done <<< "$result"
  fi
done < <(find "$DOCS_CONTENT" -name '*.md' -type f)

if [ "$bare_html_errors" -gt 0 ]; then
  echo "Found $bare_html_errors unsafe HTML pattern(s) — wrap tags in backticks, remove event handlers, and avoid javascript: URLs."
  errors=$((errors + bare_html_errors))
else
  echo "OK: no bare HTML tags found."
fi

# ── Broken internal links ──────────────────────────────────────────
if command -v zola &>/dev/null; then
  echo ""
  echo "Checking internal links..."
  build_output=$(cd "$REPO_ROOT/docs" && zola build 2>&1) || true
  broken_links=$(echo "$build_output" | grep -c "does not exist\." || true)
  if [ "$broken_links" -gt 0 ]; then
    echo "$build_output" | grep "does not exist\."
    echo ""
    echo "Found $broken_links broken internal link(s)."
    errors=$((errors + broken_links))
  else
    echo "OK: no broken internal links."
  fi
  # clean up build output
  rm -rf "$REPO_ROOT/docs/public"
else
  echo ""
  echo "SKIPPED: zola not found — skipping internal link check."
fi

echo ""
echo "Total: $errors errors"

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "Check failed."
  exit 1
fi
