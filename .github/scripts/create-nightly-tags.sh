#!/bin/bash
set -e

CREATED_TAGS=()
AFFECTED_BRANCHES=()

# Create tags for RC and Develop branches
# - Grab package version from package.json
# - Get latest commit hash and its date
# - Prepend 'v' to the package version if it doesn't exist
# - Format tag as: v<package_version>-<commit_date>
# Example: v1.2.3-20250702
# - If tag already exists, skip creating it
# - Updates package.json version field to new tag version
# - Commit the change to package.json but NOT push it - commit lets GH pass the workflow
# - AGAIN DONT MAKE CHANGES TO PUSH THE COMMIT unless requirement changes

create_tag_for_branch() {
    local branch_name=$1
    
    git checkout "$branch_name"
    
    PKG_VERSION=$(cat ./package.json | grep 'version":' | sed 's/.*"version":[ \t]*"\([^"]*\)".*/\1/')
    COMMIT_DATE=$(git log -1 --format=%cd --date=format:%m%d%H%M)
    
    if [[ -n "$PKG_VERSION" && -n "$COMMIT_DATE" ]]; then
        NEW_VERSION="$PKG_VERSION-$COMMIT_DATE"

        if [[ "$PKG_VERSION" == v* ]]; then
            TAG_NAME="$NEW_VERSION"
        else
            TAG_NAME="v$NEW_VERSION"
        fi

        if git ls-remote --tags origin | grep -q "refs/tags/${TAG_NAME}$"; then
            echo "Tag $TAG_NAME already exists for branch $branch_name (version: $PKG_VERSION, latest commit date: $COMMIT_DATE), skipping..."
            return 
        fi

        sed 's/"version":[ \t]*"[^"]*"/"version": "'"$NEW_VERSION"'"/' ./package.json > ./package.json.tmp && mv ./package.json.tmp ./package.json

        git add ./package.json
        git commit -m "Update package.json version to $NEW_VERSION for branch $branch_name"

        echo "Creating tag for $branch_name: $TAG_NAME"
        git tag "$TAG_NAME"
        git push origin "$TAG_NAME"

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