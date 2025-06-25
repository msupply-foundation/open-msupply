#!/bin/bash
set -e

CREATED_TAGS=()
AFFECTED_BRANCHES=()

create_tag_for_branch() {
    local branch_name=$1
    
    git checkout "$branch_name"
    
    PKG_VERSION=$(cat ./package.json | grep 'version":' | sed 's/.*"version":[ \t]*"\([^"]*\)".*/\1/')
    COMMIT_DATE=$(git log -1 --format=%cd --date=format:%m%d%H%M)
    
    if [[ -n "$PKG_VERSION" && -n "$COMMIT_DATE" ]]; then
        TAG_NAME="$PKG_VERSION-$COMMIT_DATE"

        if git ls-remote --tags origin | grep -q "refs/tags/${TAG_NAME}$"; then
            echo "Tag $TAG_NAME already exists for branch $branch_name (version: $PKG_VERSION, latest commit date: $COMMIT_DATE), skipping..."
            return 
        fi

        echo "Creating tag for $branch_name: $TAG_NAME"
        git tag "$TAG_NAME"
        git push origin "$TAG_NAME"

        # Store created tags and branches
        CREATED_TAGS+=("$TAG_NAME")
        AFFECTED_BRANCHES+=("$branch_name")
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

# Output results for GitHub Actions to capture
echo "CREATED_TAGS=${CREATED_TAGS[*]}" >> $GITHUB_OUTPUT
echo "AFFECTED_BRANCHES=${AFFECTED_BRANCHES[*]}" >> $GITHUB_OUTPUT
echo "HAS_TAGS=$([[ ${#CREATED_TAGS[@]} -gt 0 ]] && echo "true" || echo "false")" >> $GITHUB_OUTPUT