#!/bin/bash
set -e

# Create a nightly-style tag for the CURRENT branch, from the CLI (no GitHub Action).
#
# Mirrors .github/scripts/create-nightly-tags.sh, but:
# - Operates only on the branch you currently have checked out (RC or not).
# - The version always comes from package.json; the branch name only decides the label:
#     - RC branch  -> label "RC"          (same as nightly)
#     - otherwise  -> first 6 chars of the branch name
#   Tag shape: v<version>-<label>-<MMDDHHMM>, e.g. v3.00.00-RC-06081530
# - Bumps package.json + commits on a throwaway temp branch, tags it, then returns to your
#   branch and deletes the temp branch. Your branch's package.json is left untouched; the tag
#   keeps the bump commit reachable.
# - Prompts before pushing the tag (and only the tag, never the temp branch) to origin.

# Run from the repo root so ./package.json resolves regardless of where this is invoked from.
cd "$(git rev-parse --show-toplevel)"

ORIGINAL_BRANCH=""
TEMP_BRANCH=""

cleanup() {
    # Always return to the original branch and remove the temp branch (idempotent, never fails).
    if [[ -n "$ORIGINAL_BRANCH" ]]; then
        git checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1 || true
    fi
    if [[ -n "$TEMP_BRANCH" ]] && git show-ref --verify --quiet "refs/heads/$TEMP_BRANCH"; then
        git branch -D "$TEMP_BRANCH" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT

ORIGINAL_BRANCH=$(git branch --show-current)
if [[ -z "$ORIGINAL_BRANCH" ]]; then
    echo "Not on a branch (detached HEAD). Check out a branch and try again." >&2
    exit 1
fi

# --- Version (from package.json) ---
PKG_VERSION=$(cat ./package.json | grep 'version":' | sed 's/.*"version":[ \t]*"\([^"]*\)".*/\1/')
CLEAN_VERSION=$(echo "$PKG_VERSION" | sed -E 's/-(develop|rc)$//i')

# --- Label (from branch name) ---
if [[ "$ORIGINAL_BRANCH" =~ -[Rr][Cc]$ ]]; then
    LABEL="RC"
    LABEL_NOTE="RC branch"
else
    # First 6 chars of the branch name, with '/' replaced by '-' to avoid nested ref paths.
    LABEL=$(echo "$ORIGINAL_BRANCH" | tr '/' '-' | cut -c1-6)
    LABEL_NOTE="first 6 chars of branch name; not an RC branch"
fi

# --- Timestamp (from current HEAD, before the temp commit) ---
TIMESTAMP=$(git log -1 --format=%cd --date=format:%m%d%H%M)

if [[ -z "$CLEAN_VERSION" || -z "$LABEL" || -z "$TIMESTAMP" ]]; then
    echo "Failed to build tag (version: '$PKG_VERSION', label: '$LABEL', timestamp: '$TIMESTAMP')." >&2
    exit 1
fi

NEW_VERSION="$CLEAN_VERSION-$LABEL-$TIMESTAMP"
if [[ "$CLEAN_VERSION" == v* ]]; then
    TAG_NAME="$NEW_VERSION"
else
    TAG_NAME="v$NEW_VERSION"
fi

echo "Branch:    $ORIGINAL_BRANCH"
echo "Version:   $CLEAN_VERSION            (from package.json \"$PKG_VERSION\")"
echo "Label:     $LABEL                 ($LABEL_NOTE)"
echo "Tag:       $TAG_NAME"

# --- Duplicate check (before creating the temp branch) ---
if git tag -l | grep -q "^${TAG_NAME}$"; then
    echo "Tag $TAG_NAME already exists locally, skipping."
    exit 0
fi
if git ls-remote --tags origin | grep -q "refs/tags/${TAG_NAME}$"; then
    echo "Tag $TAG_NAME already exists on origin, skipping."
    exit 0
fi

# --- Temp branch: bump package.json, commit, tag ---
TEMP_BRANCH="tmp-tag-$TAG_NAME"
git checkout -b "$TEMP_BRANCH" >/dev/null

sed 's/"version":[ \t]*"[^"]*"/"version": "'"$NEW_VERSION"'"/' ./package.json > ./package.json.tmp && mv ./package.json.tmp ./package.json
git add ./package.json
git commit -m "Update package.json version to $NEW_VERSION for tag $TAG_NAME" >/dev/null
git tag "$TAG_NAME"
echo "On temp branch $TEMP_BRANCH: package.json version -> $NEW_VERSION, tagged."

# --- Push with confirmation (tag only) ---
read -r -p "Push tag $TAG_NAME to origin? [y/N] " ANSWER
if [[ "$ANSWER" =~ ^[Yy]$ ]]; then
    git push origin "$TAG_NAME"
    echo "Pushed tag $TAG_NAME."
else
    echo "Skipped push. Tag $TAG_NAME created locally — push later with:"
    echo "  git push origin $TAG_NAME"
fi

# cleanup() runs on EXIT: returns to $ORIGINAL_BRANCH and deletes $TEMP_BRANCH.
echo "Returning to $ORIGINAL_BRANCH and removing temp branch ($ORIGINAL_BRANCH's package.json is untouched)."
