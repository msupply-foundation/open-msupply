#!/usr/bin/env bash
# Import a pull request opened on the public mirror into this repo.
#
#   scripts/mirror/import-public-pr.sh <public PR number>
#
# The public repo (msupply-foundation/open-msupply) is a filtered rewrite of
# this one: nothing merges there, and its SHAs are not ours. So a public PR
# is brought across as PATCHES — its commits, with the contributor's
# authorship intact, applied onto develop here — and reviewed, tested and
# merged like any internal PR. It flows back out with the next sync, and the
# public PR is then closed with a comment naming the landed SHA.
# (decisions/2026-08-28_public_repo_mirroring.md § B; README.md § Public mirror)
#
# What this does:
#   1. fetches pull/<N>/head and the public develop it was based on;
#   2. creates public-pr-<N>-<slug> from origin/develop;
#   3. git am --3way the commits (their paths are all in the published set by
#      construction, so patches apply where SHAs cannot);
#   4. adds a `Public-PR: open-msupply#<N>` trailer to each imported commit;
#   5. pushes and opens the internal PR with a link back;
#   6. labels the public PR `imported` and leaves a comment saying what
#      happens next.
#
# Conflicts stop at step 3 with the usual `git am` state: resolve, `git am
# --continue`, then re-run this script with --resume to finish steps 4–6.
#
# Needs: gh (authenticated for both repos), git ≥ 2.32 (commit --trailer),
# a clean working tree.
set -euo pipefail

PUBLIC=msupply-foundation/open-msupply
INTERNAL=msupply-foundation/open-msupply-internal
PUBLIC_URL="https://github.com/$PUBLIC.git"

usage() { echo "usage: $0 <public PR number> [--resume]" >&2; exit 2; }
die() { echo "error: $*" >&2; exit 1; }

N="${1:-}"; [[ "$N" =~ ^[0-9]+$ ]] || usage
RESUME="${2:-}"
[ -z "$RESUME" ] || [ "$RESUME" = "--resume" ] || usage

command -v gh >/dev/null || die "gh is required"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "run from inside the repo"
cd "$(git rev-parse --show-toplevel)"

# ── PR facts ────────────────────────────────────────────────────────────────
json="$(gh pr view "$N" -R "$PUBLIC" --json title,author,baseRefName,state,url,headRefOid)"
title="$(jq -r .title <<<"$json")"
author="$(jq -r .author.login <<<"$json")"
base="$(jq -r .baseRefName <<<"$json")"
state="$(jq -r .state <<<"$json")"
url="$(jq -r .url <<<"$json")"
[ "$state" = "OPEN" ] || die "public PR #$N is $state, not open"
[ "$base" = "develop" ] || echo "note: public PR #$N targets '$base', importing onto develop anyway" >&2

slug="$(tr '[:upper:]' '[:lower:]' <<<"$title" | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' | cut -c1-40 | sed -E 's/-+$//')"
branch="public-pr-$N-${slug:-untitled}"
trailer="Public-PR: open-msupply#$N"

if [ -z "$RESUME" ]; then
  git diff --quiet && git diff --cached --quiet || die "working tree not clean"
  git rev-parse --verify --quiet "$branch" >/dev/null && die "branch $branch already exists (use --resume to finish an interrupted import)"

  echo "» fetching public PR #$N ($url) by @$author"
  git fetch --quiet "$PUBLIC_URL" "refs/pull/$N/head:refs/remotes/public-pr/$N" "refs/heads/$base:refs/remotes/public-pr/$base"

  echo "» branching $branch from origin/develop"
  git fetch --quiet origin develop
  git checkout --quiet -b "$branch" origin/develop

  mbox="$(mktemp -t public-pr-"$N".XXXXXX)"
  git format-patch --stdout "refs/remotes/public-pr/$base..refs/remotes/public-pr/$N" > "$mbox"
  count="$(grep -c '^From [0-9a-f]\{40\} ' "$mbox" || true)"
  [ "$count" -gt 0 ] || die "no commits in the PR beyond public $base"
  echo "» applying $count commit(s) with git am --3way"
  if ! git am --3way "$mbox"; then
    cat >&2 <<MSG

Conflicts. Resolve them in the usual git am way:
    git status
    ... fix, git add ...
    git am --continue        (or --skip / --abort)
then finish the import with:
    $0 $N --resume
MSG
    exit 1
  fi
  rm -f "$mbox"
else
  [ "$(git rev-parse --abbrev-ref HEAD)" = "$branch" ] || die "--resume expects to be on $branch"
  [ -d "$(git rev-parse --git-path rebase-apply)" ] && die "git am is still in progress — finish it first"
fi

# ── trailer, push, PRs ──────────────────────────────────────────────────────
if ! git log --format=%B origin/develop..HEAD | grep -qxF "$trailer"; then
  echo "» adding trailer '$trailer' to each imported commit"
  git rebase --quiet --exec "git commit --quiet --amend --no-edit --trailer '$trailer'" origin/develop
fi

echo "» pushing $branch"
git push --quiet -u origin "$branch"

body="$(cat <<MSG
Imported from public PR $url by @$author (\`scripts/mirror/import-public-pr.sh $N\`).

Review, CI and merge happen here; the change reaches the public repo with the next mirror sync, and the public PR is then closed with a comment naming the landed SHA. Authorship is preserved on the commits.

$trailer
MSG
)"
echo "» opening the internal PR"
internal_url="$(gh pr create -R "$INTERNAL" --base develop --head "$branch" \
  --title "$title (public PR #$N)" --body "$body")"
echo "  $internal_url"

echo "» labelling and commenting on the public PR"
gh pr edit "$N" -R "$PUBLIC" --add-label imported 2>/dev/null \
  || echo "  (could not add the 'imported' label — does it exist on $PUBLIC?)" >&2
gh pr comment "$N" -R "$PUBLIC" --body "$(cat <<MSG
Thanks @$author — this has been imported into the main development repo for review, CI and merge, with your authorship preserved on the commits. Once merged it will appear here with the next mirror sync, and this pull request will then be closed (not merged) with a comment naming the commit it landed as. See CONTRIBUTING.md § What happens next.
MSG
)" >/dev/null

echo "done: $internal_url"
