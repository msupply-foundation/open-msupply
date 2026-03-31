#!/bin/bash
set -euo pipefail

readonly TODAY=$(date +%m%d)
readonly DATE_DISPLAY=$(date +%Y-%m-%d)

merge_develop_into_branch() {
    local MERGE_BRANCH=$1

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
            echo "Please resolve conflicts in $MERGE_BRANCH and commit manually"
            git merge --abort
        else
            git commit -m "Merge develop into $MERGE_BRANCH"
        fi
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

    local pr_title="Merge $RC_BRANCH to develop - fresh commit on $TODAY"
    local pr_body="**Details:**
    - Fresh commit detected on: $DATE_DISPLAY
    - Source: This branch is based on $RC_BRANCH

This PR was created automatically by the daily RC integration workflow.
⚠️ **Note**: Any merge conflicts will be visible in this PR and need manual resolution."

    echo "Creating pull request for $MERGE_BRANCH -> develop"
    if gh pr create \
        --title "$pr_title" \
        --body "$pr_body" \
        --base develop \
        --head "$MERGE_BRANCH"; then
        echo "PR created successfully for $MERGE_BRANCH"
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
    echo "PR #$PR_NUMBER updated with latest changes from $RC_BRANCH"
}

# Main execution
echo "Checking RC branches for fresh commits on $DATE_DISPLAY"

git fetch origin

RC_BRANCHES=$(git branch -r | grep -E 'origin/v[0-9.]+-(R|r)(C|c)' | sed 's|.*origin/||')

if [[ -z "$RC_BRANCHES" ]]; then
    echo "No RC branches found"
    exit 0
fi

for RC_BRANCH in $RC_BRANCHES; do 
    echo "Checking branch: $RC_BRANCH"

    COMMIT_DATE=$(git log -1 --format=%cd --date=format:%m%d "origin/$RC_BRANCH" 2>/dev/null || echo "")
    
    if [[ "$COMMIT_DATE" != "$TODAY" ]]; then
        echo "No fresh commit found on $RC_BRANCH (commit date: $COMMIT_DATE)"
        continue
    fi

    echo "Found fresh commit on $RC_BRANCH"

    EXISTING_OPEN_PR_INFO=$(gh pr list --base develop --state open --json headRefName,number --jq ".[] | select(.headRefName | startswith(\"merge-${RC_BRANCH}-to-develop-\"))" 2>/dev/null | head -1 || echo "")
    EXISTING_OPEN_PR=$(echo "$EXISTING_OPEN_PR_INFO" | jq -r '.number // empty' 2>/dev/null || echo "")
    EXISTING_MERGE_BRANCH=$(echo "$EXISTING_OPEN_PR_INFO" | jq -r '.headRefName // empty' 2>/dev/null || echo "")

    if [[ -n "$EXISTING_OPEN_PR" ]]; then
        update_existing_pull_request "$RC_BRANCH" "$EXISTING_MERGE_BRANCH" "$EXISTING_OPEN_PR"
    else
        MERGE_BRANCH="merge-${RC_BRANCH}-to-develop-${TODAY}"
        create_new_pull_request "$RC_BRANCH" "$MERGE_BRANCH"
    fi
done

echo "RC integration check completed"