#!/bin/bash
set -euo pipefail

readonly DATE_DISPLAY=$(date +%Y-%m-%d)

HAS_UNRESOLVED_CONFLICTS=false
CONFLICTED_FILE_COUNT=0
CONFLICTED_FILES=""

merge_develop_into_branch() {
    local MERGE_BRANCH=$1
    HAS_UNRESOLVED_CONFLICTS=false
    CONFLICTED_FILE_COUNT=0
    CONFLICTED_FILES=""

    echo "Merging develop into $MERGE_BRANCH to detect conflicts"
    if git merge origin/develop --no-commit --no-ff; then
        echo "Clean merge - no conflicts detected"
        git commit -m "Merge develop into $MERGE_BRANCH"
    else
        echo "Merge conflicts detected"
        if git status --porcelain | grep -q "package.json"; then
            echo "Conflicts in package.json detected, auto-resolving"
            git checkout --theirs package.json
            git add package.json
        fi

        if git status --porcelain | grep -q "^UU\|^AA\|^DD"; then
            echo "There are unresolved conflicts that need manual resolution"
            CONFLICTED_FILE_COUNT=$(git status --porcelain | grep -cE "^(UU|AA|DD)")
            CONFLICTED_FILES=$(git status --porcelain | grep -E "^(UU|AA|DD)" | awk '{print $2}')
            git merge --abort
            HAS_UNRESOLVED_CONFLICTS=true
        else
            git commit -m "Merge develop into $MERGE_BRANCH"
        fi
    fi
}

comment_on_pr_if_conflicts() {
    local PR_NUMBER=$1
    local RC_BRANCH=$2

    if [[ "$HAS_UNRESOLVED_CONFLICTS" == "true" ]]; then
        echo "Adding conflict notification comment to PR #$PR_NUMBER"
        gh pr comment "$PR_NUMBER" --body "⚠️ **Merge conflicts detected** between \`$RC_BRANCH\` and \`develop\` on $DATE_DISPLAY — $CONFLICTED_FILE_COUNT conflicted file(s).

These conflicts need manual resolution. The merge was aborted so this branch contains only the RC changes without the develop merge."
    fi
}

generate_pr_body() {
    local RC_BRANCH=$1

    local conflict_section="✅ No merge conflicts"
    if [[ "$HAS_UNRESOLVED_CONFLICTS" == "true" ]]; then
        local file_list=""
        for f in $CONFLICTED_FILES; do
            file_list="${file_list}
- \`$f\`"
        done
        conflict_section="⚠️ **$CONFLICTED_FILE_COUNT file(s) with merge conflicts** — manual resolution required
${file_list}"
    fi

    echo "# 👩🏻‍💻 What does this PR do?

Automated merge of \`$RC_BRANCH\` into \`develop\`.
- $UNMERGED_COMMITS unmerged commit(s) detected on $DATE_DISPLAY
- Source: This branch is based on \`$RC_BRANCH\`

$conflict_section

This PR was created automatically by the RC to develop integration workflow.

## 💌 Any notes for the reviewer?

Please review the merge commit and ensure no conflicts were incorrectly resolved.

# 🧪 Testing

- [ ] CI passes on this branch

# 📃 Documentation

- [x] **No documentation required**: no user facing changes

# 📃 Reviewer Checklist

**Breaking Changes**
- [ ] No Breaking Changes in the Graphql API

**Issue Review**
- [ ] All requirements in original issue have been covered

**Tests Pass**
- [ ] Postgres
- [ ] SQLite
- [ ] Frontend"
}

create_new_pull_request() {
    local RC_BRANCH=$1
    local MERGE_BRANCH=$2

    echo "Creating new merge branch: $MERGE_BRANCH from $RC_BRANCH"
    git checkout "origin/$RC_BRANCH"
    git checkout -b "$MERGE_BRANCH"
    merge_develop_into_branch "$MERGE_BRANCH"
    git push -u origin "$MERGE_BRANCH"

    local pr_title="Merge $RC_BRANCH to develop"
    local pr_body
    pr_body=$(generate_pr_body "$RC_BRANCH")

    echo "Creating pull request for $MERGE_BRANCH -> develop"
    local pr_url
    if pr_url=$(gh pr create \
        --title "$pr_title" \
        --body "$pr_body" \
        --base develop \
        --head "$MERGE_BRANCH"); then
        echo "PR created successfully for $MERGE_BRANCH"
        local pr_number
        pr_number=$(echo "$pr_url" | grep -oE '[0-9]+$')
        comment_on_pr_if_conflicts "$pr_number" "$RC_BRANCH"
    else
        echo "ERROR: Failed to create PR for $MERGE_BRANCH"
        return 1
    fi
}

update_existing_pull_request() {
    local RC_BRANCH=$1
    local MERGE_BRANCH=$2
    local PR_NUMBER=$3

    echo "Updating PR #$PR_NUMBER: merging latest $RC_BRANCH into $MERGE_BRANCH"
    git checkout -B "$MERGE_BRANCH" "origin/$MERGE_BRANCH"

    if git merge "origin/$RC_BRANCH" --no-edit; then
        echo "Merged latest $RC_BRANCH into $MERGE_BRANCH"
    else
        echo "Conflicts merging $RC_BRANCH into $MERGE_BRANCH, aborting"
        git merge --abort
    fi

    merge_develop_into_branch "$MERGE_BRANCH"
    git push --force-with-lease origin "$MERGE_BRANCH"

    local pr_body
    pr_body=$(generate_pr_body "$RC_BRANCH")
    gh pr edit "$PR_NUMBER" --body "$pr_body"

    comment_on_pr_if_conflicts "$PR_NUMBER" "$RC_BRANCH"
    echo "PR #$PR_NUMBER updated with latest changes from $RC_BRANCH"
}

# Main execution
echo "Checking RC branches for unmerged commits"

git fetch origin

RC_BRANCHES=$(git branch -r | grep -E 'origin/v[0-9.]+-(R|r)(C|c)' | sed 's|.*origin/||')

if [[ -z "$RC_BRANCHES" ]]; then
    echo "No RC branches found"
    exit 0
fi

for RC_BRANCH in $RC_BRANCHES; do 
    echo "Checking branch: $RC_BRANCH"

    UNMERGED_COMMITS=$(git log --oneline "origin/develop..origin/$RC_BRANCH" 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$UNMERGED_COMMITS" -eq 0 ]]; then
        echo "No unmerged commits on $RC_BRANCH"
        continue
    fi

    echo "Found $UNMERGED_COMMITS unmerged commit(s) on $RC_BRANCH"

    EXISTING_OPEN_PR_INFO=$(gh pr list --base develop --state open --json headRefName,number --jq ".[] | select(.headRefName | startswith(\"merge-${RC_BRANCH}-to-develop\"))" 2>/dev/null | head -1 || echo "")
    EXISTING_OPEN_PR=$(echo "$EXISTING_OPEN_PR_INFO" | jq -r '.number // empty' 2>/dev/null || echo "")
    EXISTING_MERGE_BRANCH=$(echo "$EXISTING_OPEN_PR_INFO" | jq -r '.headRefName // empty' 2>/dev/null || echo "")

    if [[ -n "$EXISTING_OPEN_PR" ]]; then
        update_existing_pull_request "$RC_BRANCH" "$EXISTING_MERGE_BRANCH" "$EXISTING_OPEN_PR"
    else
        MERGE_BRANCH="merge-${RC_BRANCH}-to-develop"
        create_new_pull_request "$RC_BRANCH" "$MERGE_BRANCH"
    fi
done

echo "RC integration check completed"