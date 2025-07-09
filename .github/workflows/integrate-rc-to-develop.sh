#!/bin/bash
set -euo pipefail

readonly TODAY=$(date +%m%d)
readonly DATE_DISPLAY=$(date +%Y-%m-%d)

branch_exists() {
    local branch=$1
    git show-ref --verify --quiet "refs/remotes/origin/$branch"
}

create_merge_branch() {
    local RC_BRANCH=$1
    local MERGE_BRANCH=$2
    
    echo "Creating new merge branch: $MERGE_BRANCH from $RC_BRANCH"
    git fetch origin
    git checkout "origin/$RC_BRANCH"
    git checkout -b "$MERGE_BRANCH"
    git push -u origin "$MERGE_BRANCH"
    echo "Created merge branch $MERGE_BRANCH"
}

create_pull_request() {
    local RC_BRANCH=$1
    local MERGE_BRANCH=$2
    
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

# Main execution
echo "Checking RC branches for fresh commits on $DATE_DISPLAY"

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

    EXISTING_OPEN_PR=$(gh pr list --base develop --state open --json headRefName,number --jq ".[] | select(.headRefName | startswith(\"merge-${RC_BRANCH}-to-develop-\")) | .number" 2>/dev/null | head -1 || echo "")
    
    if [[ -n "$EXISTING_OPEN_PR" ]]; then
        echo "Open PR already exists for $RC_BRANCH (PR #$EXISTING_OPEN_PR), skipping"
        continue
    fi
    
    MERGE_BRANCH="merge-${RC_BRANCH}-to-develop-${TODAY}"

    if branch_exists "$MERGE_BRANCH" && [[ -z "$EXISTING_PR" ]]; then
        echo "Merge branch $MERGE_BRANCH already exists, but no PR found. Will create PR."
    else
        create_merge_branch "$RC_BRANCH" "$MERGE_BRANCH"
    fi

    create_pull_request "$RC_BRANCH" "$MERGE_BRANCH"
done

echo "RC integration check completed"