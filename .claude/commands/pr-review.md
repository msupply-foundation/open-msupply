Review code changes against a GitHub issue or PR./

Arguments: $ARGUMENTS (optional: issue/PR number or URL)

Steps:

1. **Determine what to review:**
   - If a PR number/URL is given, fetch it with `gh pr view <number> --json body,title,baseRefName,headRefName,files,comments` and use the PR's base branch for the diff.
   - If an issue number/URL is given, use it for requirements context. Determine the diff to review (see step 2).
   - If no argument is given, try to infer the issue from the current branch name (e.g. `1234-some-description` → issue #1234).

2. **Determine the diff scope** (in priority order):
   - If a PR was provided, use its base branch: `git diff <base>...HEAD`
   - Otherwise, detect the upstream tracking branch (`git rev-parse --abbrev-ref @{upstream}`).
   - If no upstream, find the best base by checking `git merge-base HEAD origin/<branch>` against likely candidates: check which remote branches the current branch was forked from using `git log --oneline --decorate --first-parent HEAD | grep -m1 'origin/'` or `git branch -r --contains $(git log --reverse --ancestry-path --format=%H HEAD | head -1)`. As a fallback, try common base branches in order: the repo's default branch, `main`, `master`, `develop`, and any `v*-RC` or release branches.
   - **Only review commits unique to this branch** — use `git diff <merge-base>...HEAD` (three-dot diff), NOT `git diff <branch>...HEAD` which can include unrelated commits from the base.
   - If there are only staged/unstaged local changes and no branch commits, review those instead.
   - **If it's still ambiguous, ask the user** what base branch to diff against before proceeding.

3. **Gather context:**
   - Fetch the issue thread with `gh issue view <number> --json body,title,comments` to understand requirements, acceptance criteria, and discussion.
   - Run `git diff <base>...HEAD --stat` and `git diff <base>...HEAD` to get the full diff.
   - Include any uncommitted changes (`git diff`, `git diff --staged`) if present.
   - Read the relevant changed files in full (not just the diff) to understand surrounding code and existing patterns.

4. **Review the changes against the issue:**
   - **Requirements coverage:** Go through each requirement/acceptance criterion in the issue and confirm whether the changes address it. Flag anything missing.
   - **Unmentioned changes:** Note any changes in the diff that aren't described or motivated by the issue thread — they may be fine (refactors, necessary prep) but should be called out.

5. **Code quality review:**
   - **Correctness:** Logic errors, off-by-one, missing error handling at system boundaries, race conditions.
   - **Consistency with existing patterns:** Check how similar features are implemented nearby and flag deviations. Look at naming conventions, module structure, error handling style, and API patterns already in use.
   - **Security:** SQL injection, XSS, command injection, auth/authz gaps, secrets in code.
   - **Performance:** Unnecessary allocations, N+1 queries, missing indexes, blocking in async contexts.
   - **Testing:** Are new/changed code paths tested? Are edge cases covered?
   - **Types & schemas:** For GraphQL/DB changes, are types, migrations, and generated code consistent?

6. **Output the review** in this format:

   ## Review: <PR/issue title>

   ### Requirements Coverage
   For each requirement in the issue:
   - ✅ Requirement — how it's addressed
   - ❌ Requirement — what's missing

   ### Changes Not in Issue
   List any changes that aren't covered by the issue description/discussion.

   ### Findings
   Group by severity:
   - 🔴 **Must fix** — bugs, security issues, data loss risks
   - 🟡 **Should fix** — code quality, consistency, maintainability
   - 🟢 **Nit** — style, naming, minor suggestions

   For each finding, reference the specific file and line.

   ### Summary
   Brief overall assessment — is this ready to merge, or what needs to change first?
