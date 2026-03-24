#!/usr/bin/env bash
#
# migrate-readmes.sh
#
# Copies all tracked README.md files into docs-site/content/docs/ as _index.md
# with Zola frontmatter prepended. Replaces original READMEs with pointer files.
#
# Content is piped directly from git — never passes through manual editing —
# to avoid any alteration of quotes, Unicode, or wording.
#
# Usage:
#   ./docs-site/migrate-readmes.sh                # dry run (default)
#   ./docs-site/migrate-readmes.sh --apply        # actually write files
#   ./docs-site/migrate-readmes.sh --verify       # diff _index.md vs original README
#
# Path transform:
#   src/ directories are stripped from docs paths (code-only convention).
#   e.g. server/service/src/sync/ -> server/service/sync/
#
set -eo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.."; pwd)"
DOCS_CONTENT="$REPO_ROOT/docs-site/content/docs"
DOCS_SITE_URL="https://docs.openmsupply.foundation/docs"
MODE="${1:---dry-run}"

# ── Skip list ─────────────────────────────────────────────────────────
# READMEs to skip entirely (e.g. root README, GitHub workflows, etc.)
should_skip() {
  case "$1" in
    "README.md") return 0 ;;                           # root README — handled separately
    ".github/workflows/ACTIONS_README.md") return 0 ;; # not developer docs
    *) return 1 ;;
  esac
}

# ── Helper: extract h1 title from a README ───────────────────────────
# Uses the first heading found (h1, then h2, then h3).
# Falls back to the directory name if no heading found.
extract_title() {
  local readme_path="$1"
  local dir_name="$2"
  local title=""

  # Try h1 first, then h2, then h3
  title=$(git -C "$REPO_ROOT" show "HEAD:$readme_path" | grep -m1 '^# ' | sed 's/^#* *//' || true)
  if [ -z "$title" ]; then
    title=$(git -C "$REPO_ROOT" show "HEAD:$readme_path" | grep -m1 '^## ' | sed 's/^#* *//' || true)
  fi
  if [ -z "$title" ]; then
    title=$(git -C "$REPO_ROOT" show "HEAD:$readme_path" | grep -m1 '^### ' | sed 's/^#* *//' || true)
  fi
  if [ -z "$title" ]; then
    title="$dir_name"
  fi

  echo "$title"
}

# ── Helper: compute destination directory ─────────────────────────────
# Mirrors the repo path but strips src/ segments (code-only convention).
get_dest_dir() {
  local readme="$1"
  local src_dir
  src_dir="$(dirname "$readme")"

  # Strip /src/ segments from the path
  echo "$src_dir" | sed 's|/src/|/|g; s|/src$||'
}

# ── Main ──────────────────────────────────────────────────────────────

# Get all tracked READMEs
readmes=$(git -C "$REPO_ROOT" ls-files '*.md' | grep -i 'README\.md$' | sort)

echo "Mode: $MODE"
echo "Found $(echo "$readmes" | wc -l | tr -d ' ') README files"
echo ""

errors=0
created=0
skipped=0

while IFS= read -r readme; do
  # Skip if in skip list
  if should_skip "$readme"; then
    echo "SKIP: $readme (in skip list)"
    skipped=$((skipped + 1))
    continue
  fi

  src_dir="$(dirname "$readme")"
  dest_dir="$(get_dest_dir "$readme")"
  dest_path="$DOCS_CONTENT/$dest_dir/_index.md"
  dest_url="$DOCS_SITE_URL/$dest_dir/"
  dest_source="docs-site/content/docs/$dest_dir/_index.md"
  dir_name="$(basename "$dest_dir")"

  # Extract title from README
  title="$(extract_title "$readme" "$dir_name")"
  # Escape double quotes in title for TOML
  title_escaped=$(echo "$title" | sed 's/"/\\"/g')

  if [ "$MODE" = "--dry-run" ]; then
    echo "WOULD CREATE: $dest_path"
    echo "  title: $title"
    echo "  from:  $readme"
    echo "  pointer: $readme -> $dest_source"
    echo ""
    created=$((created + 1))

  elif [ "$MODE" = "--apply" ]; then
    # Create destination directory
    mkdir -p "$(dirname "$dest_path")"

    # Write _index.md: frontmatter + original content (piped directly from git)
    printf '+++\ntitle = "%s"\nweight = 10\nsort_by = "weight"\ntemplate = "docs/section.html"\n+++\n\n' "$title_escaped" > "$dest_path"
    git -C "$REPO_ROOT" show "HEAD:$readme" >> "$dest_path"

    # Copy co-located images: find image references and copy the files
    { git -C "$REPO_ROOT" show "HEAD:$readme" | grep -o '!\[.*\]([^)]*)' | sed 's/.*(\(.*\))/\1/' || true; } | while IFS= read -r img_ref; do
      # Only handle relative paths (not URLs)
      case "$img_ref" in
        http*) continue ;;
      esac
      img_src="$REPO_ROOT/$src_dir/$img_ref"
      if [ -f "$img_src" ]; then
        img_dest_dir="$DOCS_CONTENT/$dest_dir/images"
        mkdir -p "$img_dest_dir"
        cp "$img_src" "$img_dest_dir/"
        echo "  IMAGE: copied $(basename "$img_ref") -> $img_dest_dir/"
      else
        echo "  IMAGE WARNING: $img_src not found"
      fi
    done

    # Verify: diff written content (minus frontmatter) against original from git
    diff_output=$(diff <(tail -n +8 "$dest_path") <(git -C "$REPO_ROOT" show "HEAD:$readme") 2>&1 || true)
    if [ -n "$diff_output" ]; then
      echo "VERIFY FAILED: $dest_path"
      echo "$diff_output"
      errors=$((errors + 1))
    fi

    # Replace original README with pointer
    printf '# %s\n\n- **Docs site**: %s\n- **Source**: [%s](/%s)\n' "$title" "$dest_url" "$dest_source" "$dest_source" > "$REPO_ROOT/$readme"

    echo "CREATED: $dest_path"
    created=$((created + 1))

  elif [ "$MODE" = "--verify" ]; then
    if [ -f "$dest_path" ]; then
      # Strip frontmatter (everything between +++ markers) and the blank line after
      diff_output=$(diff <(tail -n +8 "$dest_path") <(git -C "$REPO_ROOT" show "HEAD:$readme") 2>&1 || true)
      if [ -z "$diff_output" ]; then
        echo "OK: $dest_path"
      else
        echo "DIFF: $dest_path"
        echo "$diff_output"
        echo ""
        errors=$((errors + 1))
      fi
    else
      echo "MISSING: $dest_path"
      errors=$((errors + 1))
    fi
  fi

done <<< "$readmes"

echo ""
echo "Summary: $created processed, $skipped skipped, $errors errors"

if [ "$MODE" = "--dry-run" ]; then
  echo ""
  echo "This was a dry run. Run with --apply to write files."
  echo "After applying, run with --verify to check content matches."
fi
