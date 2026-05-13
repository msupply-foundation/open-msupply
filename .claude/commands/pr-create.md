Create a branch, commit changes, and open a PR.

Arguments: `<issue-number> [claude-warning]`
- First argument (REQUIRED): the issue number (e.g. `1234` or `#1234`). If not provided, ask for it before proceeding.
- Base branch (optional): request this if it's not very clear what branch should be used
- Second argument (optional): `warn` — if present, add a Claude AI warning box at the very top of the PR body (before `Fixes #`). See Step 3 for details.

## Step 1: Create a branch

1. Parse the issue number from the argument (e.g. `1234` or `#1234`)
2. Run `git diff --staged` and `git diff` to understand the current changes
3. Read the key changed files to understand context and pick a short descriptive branch name
4. Create and switch to a new branch named `<issue-number>-short-description` (e.g. `1234-fix-login-redirect`). Use lowercase kebab-case for the description portion, keep it under 5 words.
5. If the branch already exists (e.g. you're already on it), skip creation and continue

## Step 2: Commit changes (if any uncommitted changes exist)

1. Run `git status` to check for uncommitted changes. If the working tree is clean, skip to Step 3.
2. Run `git log --oneline -20` to see recent commit message style
3. Run `git diff --staged` and `git diff` to understand the changes
4. If changes span multiple files, read the key changed files to understand context
5. Stage all relevant changes (prefer specific files over `git add -A`)
6. Craft a commit message following the repo's style:
   - First line MUST be under 72 characters
   - First line should be a concise summary
   - Add a blank line after the first line if a body is needed
   - Body can elaborate on what and why (not how)
7. Commit the changes (use HEREDOC for the message)

## Step 3: Push and create the PR

1. Read the PR template at `.github/pull_request_template.md`
2. Determine the base branch: check upstream tracking or fall back to default branch (`git remote show origin | grep 'HEAD branch'`)
3. Run `git log <base>..HEAD --oneline` and `git diff <base>...HEAD --stat` to understand all committed changes on this branch
4. Read relevant changed files to understand what was done and why
5. **Fetch the related issue** using `gh issue view <issue-number>` to read the issue description and requirements
6. **Compare implementation to the issue**: identify any differences between what the issue asked for and what was actually implemented. Note:
   - Requirements from the issue that were NOT implemented or were deferred
   - Implementation choices that differ from what the issue described
   - Extra changes made that weren't explicitly requested in the issue
   - Use these findings to inform the PR description and reviewer notes
7. Push the branch to origin with `-u` flag
8. Fill out the PR template with real content:
   - If the `warn` argument was provided, add the following block at the very top of the PR body (before `Fixes #`):
     ```
     > [!WARNING]
     > This PR was largely authored by Claude
     ```
   - Set `Fixes #<issue-number>` using the provided issue number
   - Write a clear description of what the PR does
   - In the reviewer notes section, highlight any **implementation differences** from the issue (from step 6). Be transparent about what diverged and why.
   - Add reviewer notes highlighting key changes or risks
   - Fill in realistic testing steps specific to the changes
   - Check the appropriate documentation boxes
9. Create the PR using `gh pr create` with the filled-out template as the body (use HEREDOC for formatting). The title format MUST be `#<issue-number> <concise summary>` (e.g. `#1234 Fix login redirect on expired sessions`). Keep the total title under 70 characters.
10. Return the PR URL when done
