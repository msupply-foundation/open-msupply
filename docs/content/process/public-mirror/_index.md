+++
title = "Public Mirror"
weight = 20
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# The public mirror

Open mSupply is developed in the private `open-msupply-internal` repo. The open-source part of it
is published to [msupply-foundation/open-msupply](https://github.com/msupply-foundation/open-msupply)
as a **filtered rewrite of history**: `develop`, `main` and the `vX.Y.Z` release tags, with private
paths removed from every commit. The decision and its reasoning are in the KDD
`decisions/2026-08-28_public_repo_mirroring.md`; the maintainer-facing summary and the public-PR
import steps are in the internal `README.md` § Public mirror. This page is the **operational**
half: how the sync runs, and what to do when something was published that should not have been.

## How the sync runs

- **Rules.** `.github/mirror/rules.txt`: one ordered list, first match wins, a path matching no
  rule is private. Evaluated by `.github/mirror/mirror_rules.py`, the single implementation shared
  by the PR check, the linter, the sync and the `mirror-paths` skill.
- **Every PR** runs `mirror-dry-run.yaml`: lints the rules and posts one sticky comment listing the
  PR's new paths with their verdicts, every new published folder, what a rules edit flips across
  the whole history, and whether the next sync would be a force-push. The required check fails
  until a reviewer adds the `mirror-reviewed` label when the PR edits `rules.txt`, or publishes a
  folder no rule has looked at yet — one near the top of the tree, or one sitting beside an
  existing carve-out. A new file inside a folder the mirror already publishes does not block: that
  folder's rule was reviewed when it was written.
- **By hand, on release day** and whenever else a refresh is wanted: dispatch
  `mirror-public.yaml` from `develop` (Actions → Public mirror sync → Run workflow). Leave `refs`
  empty (develop, main and all release tags) or name the refs; leave `force` off. The `filter` job
  clones the selected refs, runs `git filter-repo` through the rules and the commit-message
  rewrite, re-checks the filtered tree against the rules, and hands a bundle to the `push` job. The push job re-checks the tree again, mints a
  `tmf-ci-bot` App token scoped to the public repo only, and pushes **without force**. A
  non-fast-forward push fails — that is the alarm. Every run publishes develop, main and all
  release tags, so the public develop is a snapshot as of the last dispatch.
- **The `public-mirror` environment** on the push job allows dispatches from protected branches
  only (`develop`, `main`), so the sync can never run from a branch with edited rules. It holds
  no secrets and adds no delay.
- **How long it takes.** The filter pipeline is ~75 seconds for all 144 refs on a developer laptop — `filter-repo` itself is 29s over 40.8k commits — so budget a few minutes for the `filter` job on a hosted runner, most of it the `fetch-depth: 0` checkout and the 389MB artifact upload rather than the rewrite. A dispatch is cheap; this is not a reason to avoid running one.
- **Where it publishes** is the `PUBLIC_MIRROR_REPO` repository variable (Settings → Secrets and variables → Actions → Variables), not a constant in the workflow. Normally `msupply-foundation/open-msupply`. Both jobs read it and fail closed when it is empty, which makes clearing it the stop button — see [stopping the sync](#runbook-stop-the-sync). Pointing it at a scratch repo is how a sync is rehearsed without editing a workflow on a protected branch; the variable is not the allowlist, because a token can only be minted for a repo `tmf-ci-bot` is installed on.

## Runbook: something private was published

Treat this as an incident. Forks and clones keep objects, so anything that was a secret is
compromised the moment it was pushed, whatever happens next.

1. **Rotate first.** If a credential, key, token or certificate leaked, rotate it now, before
   touching the mirror. Rewriting history does not un-leak it.
2. **Add the rule.** In `.github/mirror/rules.txt`, add a `- <path>` line to the **historical
   exclusions block at the top of the file**. Use the exact path, or a directory rule for a
   directory. Never remove or edit an existing line in that block; the linter refuses it.
3. **Open the PR.** The dry-run comment will list the path under "newly private" with its commit
   count and state that the next sync is a force-push. That is expected. Get it reviewed and
   merged to `develop` as fast as the review allows. Every `rules.txt` edit needs the
   `mirror-reviewed` label, including one that only removes: hiding a path rewrites published
   history, which is no smaller a decision than revealing one.
4. **Log the republication.** In the same PR (or a follow-up merged before the sync), add a row to
   the *Republication log* table at the bottom of `README.public.md`: date, the refs rewritten,
   and a one-line reason that does not itself repeat what leaked. A template row and the rules
   for each column are in an HTML comment directly under that table.
5. **Dispatch with force.** Run `mirror-public.yaml` by `workflow_dispatch` with `force` ticked
   and `refs` empty (every published ref shares the rewritten history). Watch the run: the
   self-check step must pass, and the push must succeed. The push is atomic, so a failure leaves
   the public repo untouched — fix the cause and re-dispatch, rather than chasing a half-rewritten
   remote.
6. **Verify on the public repo.** `git log --all -- <path>` on a fresh clone of the public repo
   returns nothing. The republication row is visible in the public README.
7. **Tell the forks.** If the public repo has active forks or open PRs, comment on the open PRs
   that history was rewritten and they need to rebase (the README banner explains how).
8. **Write it up.** A short note in the internal PR or issue: what leaked, when it was published,
   when it was rotated, when it was rewritten. If a rule or guard should have caught it, open the
   follow-up.

## Runbook: publishing something previously private

The same steps in the other direction (a `-` rule removed from the main body of the file, or a
`+` rule added). The dry-run comment lists the paths under "newly published"; the PR needs the
`mirror-reviewed` label; the sync is a force-push and gets a republication-log row. Do this
rarely and deliberately — every fork rebases.

## Runbook: stop the sync

**Clear the `PUBLIC_MIRROR_REPO` variable** (Settings → Secrets and variables → Actions → Variables). Both jobs exit non-zero on an empty value, so a new dispatch fails in its first step and a run already filtering stops before it pushes — `push` re-reads the variable after the filter job. Set it back to `msupply-foundation/open-msupply` to re-enable, and note in the issue why it was stopped, since an absent variable records nothing by itself.

This blocks future pushes only. History already on the public repo stays there; removing that is the [leak runbook](#runbook-something-private-was-published).

For a stop that configuration cannot undo, remove the public repo from the `tmf-ci-bot` App installation instead. Slower to reverse — reach for it if the pipeline itself is what you distrust.

## Runbook: the scheduled sync failed

- **Non-fast-forward on push.** Someone pushed to the public repo directly, or a rewrite was not
  logged. Do not force. Find out what changed on the public side (`git fetch` it and look), import
  anything worth keeping through `.github/mirror/import-public-pr.sh` or by hand, then decide
  whether a logged republication is warranted.
- **Self-check failed** ("path(s) in the filtered tree are not publishable"). The filter and the
  rules disagree: a filter bug, or a rules edit that landed between the two jobs. Nothing was
  pushed. Fix and re-run.
