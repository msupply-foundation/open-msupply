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
  PR's new paths with their verdicts, what a rules edit flips across the whole history, and whether
  the next sync would be a force-push. A PR that publishes anything new fails the required check
  until a reviewer adds the `mirror-reviewed` label.
- **Nightly** (`mirror-public.yaml`, scheduled) the `filter` job clones the selected refs, runs
  `git filter-repo` through the rules and the commit-message rewrite, re-checks the filtered tree
  against the rules, runs gitleaks over the filtered history, and hands a bundle to the `push` job.
  The push job re-checks the tree again, mints a GitHub App token scoped to the public repo
  (`public-mirror` environment), and pushes **without force**. A non-fast-forward push fails —
  that is the alarm.
- **Release days:** dispatch `mirror-public.yaml` by hand so `main` and the tag go out together.
  Leave `refs` empty (develop, main and all release tags) or name the refs; leave `force` off.

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
   merged to `develop` as fast as the review allows; label `mirror-reviewed` is not needed for a
   change that only removes.
4. **Log the republication.** In the same PR (or a follow-up merged before the sync), add a row to
   the *Republication log* table at the bottom of `README.public.md`: date, the refs rewritten,
   and a one-line reason that does not itself repeat what leaked.
5. **Dispatch with force.** Run `mirror-public.yaml` by `workflow_dispatch` with `force` ticked
   and `refs` empty (every published ref shares the rewritten history). Watch the run: the
   self-check and gitleaks steps must pass, and the push must succeed.
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

## Runbook: the scheduled sync failed

- **Non-fast-forward on push.** Someone pushed to the public repo directly, or a rewrite was not
  logged. Do not force. Find out what changed on the public side (`git fetch` it and look), import
  anything worth keeping through `scripts/mirror/import-public-pr.sh` or by hand, then decide
  whether a logged republication is warranted.
- **Self-check failed** ("path(s) in the filtered tree are not publishable"). The filter and the
  rules disagree: a filter bug, or a rules edit that landed between the two jobs. Nothing was
  pushed. Fix and re-run.
- **gitleaks failed.** Something that looks like a secret is in the published history. Nothing
  was pushed. Read the report artifact; if it is real, follow the leak runbook from step 1 but
  without the "verify on the public repo" urgency — it never left; if it is a false positive,
  add a `.gitleaks.toml` allowlist entry with a comment saying why.
