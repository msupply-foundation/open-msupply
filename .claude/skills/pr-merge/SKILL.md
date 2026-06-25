---
name: pr-merge
description: This skill should be used when the user asks to "merge a branch", "merge X into Y", "resolve this merge", "finish the merge", "help with merge conflicts", or is sitting on an in-progress merge with conflict markers. It runs `git merge --no-commit`, investigates *why* each side made its changes via `git log`/`gh pr view`, catches silent non-conflicting overlaps (schema/API drift, codegen, flags, tests), and summarises every resolution in a table with PR/issue citations. Trigger it any time a merge needs more than a trivial fast-forward.
argument-hint: "[<branch-or-ref>]"
---

Merge a branch (or finish an in-progress merge), investigate *why* each side made its changes, and summarise the resolution in a table.

Arguments: `[<branch-or-ref>]` — branch to merge into the current one. If omitted, check for an in-progress merge and resolve that. Otherwise ask.

## Step 1: Set up

- Detect in-progress merge via `git status` (look for "You have unmerged paths" / "All conflicts fixed but you are still merging"). Don't rely on `.git/MERGE_HEAD` — that path is wrong inside worktrees. If you need the file directly, resolve it with `git rev-parse --git-path MERGE_HEAD`.
- If no merge in progress: `git fetch` if needed, then `git merge --no-commit --no-ff <branch>`. Don't abort on conflicts.
- `OURS` = HEAD, `THEIRS` = the other side. Find the merge base.

## Step 2: Investigate

For each **conflicting hunk** AND each non-trivial **non-conflicting overlap**:

1. Read the hunk in context.
2. Blame each side: `git log <base>..OURS -- <file>` and same for THEIRS. For specific lines use `git log -L`.
3. Map commit → PR: `gh api repos/:owner/:repo/commits/<sha>/pulls`. Read the PR/issue with `gh pr view` / `gh issue view` to capture *motivation*, not just the diff.

## Step 3: Look for silent (non-conflicting) merge problems

Conflict markers only catch textual overlap. Also check:

- **Migrations / schema** — both sides added migrations, numbering or sequence collides, or one side's migration assumes a column the other side renamed.
- **API ↔ caller drift** — one side changed a function signature, struct field, GraphQL schema, route, or type; the other side added new callers using the old shape. Enumerate renames per side: `git diff <base>..<side> -- '<lang-globs>' | grep -E '^[+-]\s*pub (fn|struct|enum)|^[+-]\s*pub [a-z_]+:'`. For any symbol present on one side and absent on the other, grep the merged tree for old-name callers. Pay extra attention to renamed fields on shared row/filter/input types — conflict markers won't catch new callers added on the other branch.
- **Generated files** — codegen outputs (`.generated.ts`, lockfiles, schema dumps) that need regeneration after merge.
- **Config / feature flags** — one side removed a flag the other side started using.
- **Tests** — new tests on one side that exercise code the other side changed.

Flag these in the table even though git didn't mark them as conflicts.

## Step 4: Resolve

Pick OURS / THEIRS / BOTH / CUSTOM per hunk. Prefer the side whose motivation is still load-bearing; combine if both are. Ask the user for risky/ambiguous picks before writing. `git add` each resolved file.

Never use `-X ours`/`-X theirs` — they skip the investigation this command exists for.

## Step 5: Summary table

| File:Lines | Ours (PR/issue) | Theirs (PR/issue) | Picked | Why |
|---|---|---|---|---|

- File:Lines must be a clickable markdown link relative to the repo root: `[file.rs:42-55](path/to/file.rs#L42-L55)` (single line: `#L42`). Do **not** use backticks or plain text for the path.
- One row per hunk (group only if reasoning is identical).
- Include silent-conflict rows from Step 3 (mark Picked as e.g. **BOTH + regen** or **CUSTOM**).
- Cite PR/issue numbers; if none found, write `commit <sha>: <subject>`.
- "Why" references motivation, not recency. Mark `(user-directed)` where the user decided.

## Step 6: Finish

- `git diff --check` for leftover markers.
- Run typecheck/`cargo check` on the merged tree **before** producing the table — this is the backstop for silent symbol/field renames Step 3 missed. Pipe slow output to `/tmp/pr-merge-check.out` and grep. Treat any errors as additional rows in the table and fix them.
- Show the table + `git status`. **Do not commit or push** — wait for the user.
