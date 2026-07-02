---
name: pr-create
description: This skill should be used when the user asks to "create a PR", "open a pull request", "raise a PR", "submit a PR", "push and open a PR", or describes shipping work for a GitHub issue (e.g. "let's PR this for issue 1234"). It branches, commits, fills out the repo's PR template, gates on user approval via plan mode, and runs `gh pr create`. Trigger it whenever the user is ready to turn local work into a pull request.
argument-hint: <issue-number|no-issue> [base-branch] [warn]
---

Create a branch, commit changes, and open a PR.

Arguments: `<issue-number|no-issue> [base-branch] [warn]`
- `<issue-number>` (required by default): e.g. `1234` or `#1234`. If missing, inferer from history, ask the user if nothing found.
- `no-issue` enter this if the user explicitly says no linked issue. Then:
  - Skip `Fixes #` and `gh issue view`
  - Branch name omits issue
  - PR title omits issue
  - Pass `--label "no linked issue"` to `submit.sh`
- `base-branch` (optional): branch to target. If omitted, use upstream tracking, else the repo default.
- `warn` (optional): adds a "largely authored by Claude" warning box at the top of the PR body.

## Step 1: Branch

Create `<issue-number>-<short-kebab-description>` (≤5 words). In no-issue mode, drop the prefix: just `<short-kebab-description>`. Skip if already on a matching branch.

## Step 2: Commit (if uncommitted changes exist)

Match the repo's commit style (`git log --oneline -20`). First line under 72 chars. Body explains why, not how.

## Step 3: PR

1. Read `.github/pull_request_template.md`.
2. Determine base branch:
   - Arg given? Use it.
   - Just created the branch in Step 1? Use the branch we were on before.
   - Already on a feature branch? Pick the remote branch (`refs/remotes/origin/*`, excluding HEAD itself) whose `git merge-base` with HEAD is most recent — supports stacked PRs.
3. Review all commits on this branch (`git log <base>..HEAD`, `git diff <base>...HEAD --stat`, read key files).
4. `gh issue view <issue-number>` and compare implementation to the issue. Note deferred requirements, divergences, and extras — these go in reviewer notes.
5. Push with `-u`.
6. Fill out the template:
   - `Fixes #<issue-number>`
   - Reviewer notes: call out implementation differences from the issue transparently
   - Realistic test steps; appropriate doc boxes
   - If `warn` arg: prepend `> [!WARNING]\n> This PR was largely authored by Claude` above `Fixes #`
7. **Approval gate via plan mode.** `EnterPlanMode` → write the plan file → `ExitPlanMode`. The plan file IS what gets submitted, so it must contain ONLY:
   - Line 1: `# <PR title>` — must start with `#<issue-number> ` and be ≤70 chars total (excluding the leading `# ` markdown). This line becomes the PR title.
   - Blank line.
   - PR body verbatim.

   For terminal users, warn them to pick option 2 ("auto-accept edits"), NOT the default option 1, which clears context and breaks the next step. VSCode users can ignore.
8. After approval, the plan file path is in the post-exit system message. Submit with the bundled helper (extracts the title from line 1, streams the body into `gh` via stdin). Extra args after the plan file are passed straight to `gh pr create`:
   `bash ${CLAUDE_SKILL_DIR}/submit.sh <plan-file> --base <base> [--draft --label ...]`
9. Return the PR URL.
