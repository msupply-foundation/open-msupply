#!/bin/bash
set -e

create_tag_for_branch() {
    local branch_name=$1
    
    git checkout "$branch_name"
    
    PKG_VERSION=$(cat ./package.json | grep 'version":' | sed 's/.*"version": *"\([^"]*\)".*/\1/')
    COMMIT_DATE=$(git log -1 --format=%cd --date=format:%m%d%H%M)
    
    if [[ -n "$PKG_VERSION" && -n "$COMMIT_DATE" ]]; then
        TAG_NAME="$PKG_VERSION-$COMMIT_DATE"
        echo "Creating tag for $branch_name: $TAG_NAME"
        git tag "$TAG_NAME"
        git push origin "$TAG_NAME"
    else
        echo "Failed to generate tag for $branch_name (PKG_VERSION: '$PKG_VERSION', COMMIT_DATE: '$COMMIT_DATE')"
    fi
}

# Get all RC branches
RC_BRANCHES=$(git branch -r | grep -E 'v[0-9.]+-(R|r)(C|c)' | sed 's/.*origin\///')

# Process all RC branches and develop
for BRANCH in $RC_BRANCHES 'develop'; do
    create_tag_for_branch "$BRANCH"
done