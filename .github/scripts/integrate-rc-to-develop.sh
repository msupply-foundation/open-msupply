#!/bin/bash
set -euo pipefail

readonly YESTERDAY=$(date -d "yesterday" +%m%d 2>/dev/null || date -v-1d +%m%d)
readonly YESTERDAY_DISPLAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)

HAS_UNRESOLVED_CONFLICTS=false
CONFLICTED_FILE_COUNT=0

merge_develop_into_branch() {
    local MERGE_BRANCH=$1
    HAS_UNRESOLVED_CONFLICTS=false
    CONFLICTED_FILE_COUNT=0

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
        gh pr comment "$PR_NUMBER" --body "⚠️ **Merge conflicts detected** between \`$RC_BRANCH\` and \`develop\` on $YESTERDAY_DISPLAY — $CONFLICTED_FILE_COUNT conflicted file(s).

These conflicts need manual resolution. The merge was aborted so this branch contains only the RC changes without the develop merge."
    fi
}

create_new_pull_request() {
    local RC_BRANCH=$1
    local MERGE_BRANCH=$2

    echo "Creating new merge branch: $MERGE_BRANCH from $RC_BRANCH"
    git checkout "origin/$RC_BRANCH"
    git checkout -b "$MERGE_BRANCH"
    merge_develop_into_branch "$MERGE_BRANCH"
    git push -u origin "$MERGE_BRANCH"

    local pr_title="Merge $RC_BRANCH to develop - commit on $YESTERDAY_DISPLAY"
    local pr_body="**Details:**
    - Fresh commit detected on: $YESTERDAY_DISPLAY
    - Source: This branch is based on $RC_BRANCH

This PR was created automatically by the daily RC integration workflow.
⚠️ **Note**: Any merge conflicts will be visible in this PR and need manual resolution."

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

    echo "Updating PR #$PR_NUMBER: resetting $MERGE_BRANCH to latest $RC_BRANCH"
    git checkout -B "$MERGE_BRANCH" "origin/$RC_BRANCH"
    merge_develop_into_branch "$MERGE_BRANCH"
    git push --force-with-lease origin "$MERGE_BRANCH"
    comment_on_pr_if_conflicts "$PR_NUMBER" "$RC_BRANCH"
    echo "PR #$PR_NUMBER updated with latest changes from $RC_BRANCH"
}

# Main execution
echo "Checking RC branches for fresh commits on $YESTERDAY_DISPLAY"

git fetch origin

RC_BRANCHES=$(git branch -r | grep -E 'origin/v[0-9.]+-(R|r)(C|c)' | sed 's|.*origin/||')

if [[ -z "$RC_BRANCHES" ]]; then
    echo "No RC branches found"
    exit 0
fi

for RC_BRANCH in $RC_BRANCHES; do 
    echo "Checking branch: $RC_BRANCH"

    COMMIT_DATE=$(git log -1 --format=%cd --date=format:%m%d "origin/$RC_BRANCH" 2>/dev/null || echo "")
    
    if [[ "$COMMIT_DATE" != "$YESTERDAY" ]]; then
        echo "No recent commit found on $RC_BRANCH (commit date: $COMMIT_DATE)"
        continue
    fi

    echo "Found recent commit on $RC_BRANCH (commit date: $COMMIT_DATE)"

    EXISTING_OPEN_PR_INFO=$(gh pr list --base develop --state open --json headRefName,number --jq ".[] | select(.headRefName | startswith(\"merge-${RC_BRANCH}-to-develop-\"))" 2>/dev/null | head -1 || echo "")
    EXISTING_OPEN_PR=$(echo "$EXISTING_OPEN_PR_INFO" | jq -r '.number // empty' 2>/dev/null || echo "")
    EXISTING_MERGE_BRANCH=$(echo "$EXISTING_OPEN_PR_INFO" | jq -r '.headRefName // empty' 2>/dev/null || echo "")

    if [[ -n "$EXISTING_OPEN_PR" ]]; then
        update_existing_pull_request "$RC_BRANCH" "$EXISTING_MERGE_BRANCH" "$EXISTING_OPEN_PR"
    else
        MERGE_BRANCH="merge-${RC_BRANCH}-to-develop-${YESTERDAY}"
        create_new_pull_request "$RC_BRANCH" "$MERGE_BRANCH"
    fi
done

echo "RC integration check completed"