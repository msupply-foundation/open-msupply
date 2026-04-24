#!/bin/bash
set -euo pipefail

# =============================================================================
# Docker Hub Tag Cleanup
#
# Deletes non-release Docker Hub tags older than a configurable number of days.
# Release tags (e.g. v2.19.1-sqlite-amd64) are always kept.
#
# Runnable locally or in CI. Credentials via environment variables.
#
# Usage:
#   export DOCKER_USERNAME=myuser
#   export DOCKER_TOKEN=mytoken
#   bash .github/scripts/cleanup-docker-tags.sh --dry-run --max-age-days 14
# =============================================================================

REPO="msupplyfoundation/omsupply"
MAX_AGE_DAYS=30
DRY_RUN=false

usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Delete old non-release Docker Hub tags from $REPO.

Options:
  --dry-run              Show what would be deleted without deleting
  --max-age-days DAYS    Delete non-release tags older than DAYS (default: $MAX_AGE_DAYS)
  --help                 Show this help message

Environment variables (required):
  DOCKER_USERNAME        Docker Hub username
  DOCKER_TOKEN           Docker Hub token or password
EOF
    exit 0
}

# ---------------------------------------------------------------------------
# Parse CLI arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --max-age-days)
            MAX_AGE_DAYS="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Validate credentials
# ---------------------------------------------------------------------------
if [[ -z "${DOCKER_USERNAME:-}" || -z "${DOCKER_TOKEN:-}" ]]; then
    echo "ERROR: DOCKER_USERNAME and DOCKER_TOKEN environment variables must be set."
    echo ""
    echo "  export DOCKER_USERNAME=myuser"
    echo "  export DOCKER_TOKEN=mytoken"
    echo ""
    exit 1
fi

# ---------------------------------------------------------------------------
# Check for jq
# ---------------------------------------------------------------------------
if ! command -v jq &>/dev/null; then
    echo "ERROR: jq is required but not installed."
    echo "  macOS:  brew install jq"
    echo "  Linux:  apt-get install jq"
    exit 1
fi

# ---------------------------------------------------------------------------
# Compute cutoff date (cross-platform: GNU date and macOS date)
# ---------------------------------------------------------------------------
if date -d "1 day ago" +%s &>/dev/null; then
    # GNU date
    CUTOFF_EPOCH=$(date -u -d "${MAX_AGE_DAYS} days ago" +%s)
else
    # macOS date
    CUTOFF_EPOCH=$(date -u -v-${MAX_AGE_DAYS}d +%s)
fi

# ---------------------------------------------------------------------------
# Convert an ISO 8601 timestamp to epoch seconds (cross-platform)
# ---------------------------------------------------------------------------
iso_to_epoch() {
    local ts="$1"
    # Strip sub-second precision and trailing Z for compatibility
    local clean
    clean=$(echo "$ts" | sed -E 's/\.[0-9]+Z$/Z/' | sed 's/Z$//')
    if date -d "$clean" +%s &>/dev/null 2>&1; then
        date -u -d "$clean" +%s
    else
        # macOS: convert ISO 8601 to a format date -j can parse
        date -u -j -f "%Y-%m-%dT%H:%M:%S" "$clean" +%s 2>/dev/null || echo "0"
    fi
}

echo "=== Docker Hub Tag Cleanup ==="
echo "Repository: $REPO"
echo "Max age:    $MAX_AGE_DAYS days"
echo "Dry run:    $DRY_RUN"
echo ""

# ---------------------------------------------------------------------------
# Authenticate with Docker Hub
# ---------------------------------------------------------------------------
echo "Authenticating with Docker Hub..."
TOKEN=$(curl -s -X POST "https://hub.docker.com/v2/users/login/" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"${DOCKER_USERNAME}\", \"password\": \"${DOCKER_TOKEN}\"}" \
    | jq -r '.token')

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
    echo "ERROR: Failed to authenticate with Docker Hub. Check your credentials."
    exit 1
fi
echo "Authenticated successfully."
echo ""

# ---------------------------------------------------------------------------
# Iterate through all tags with pagination
# ---------------------------------------------------------------------------
DELETED_COUNT=0
KEPT_COUNT=0
PAGE_URL="https://hub.docker.com/v2/repositories/${REPO}/tags/?page_size=100"

while [[ "$PAGE_URL" != "null" && -n "$PAGE_URL" ]]; do
    RESPONSE=$(curl -s -H "Authorization: Bearer ${TOKEN}" "$PAGE_URL")
    PAGE_URL=$(echo "$RESPONSE" | jq -r '.next // "null"')

    TAGS=$(echo "$RESPONSE" | jq -c '.results[]' 2>/dev/null) || true

    while IFS= read -r tag_json; do
        [[ -z "$tag_json" ]] && continue

        TAG_NAME=$(echo "$tag_json" | jq -r '.name')
        LAST_UPDATED=$(echo "$tag_json" | jq -r '.last_updated')

        # Protect special tags
        if [[ "$TAG_NAME" == "latest" ]]; then
            echo "KEEP (protected):  $TAG_NAME"
            KEPT_COUNT=$((KEPT_COUNT + 1))
            continue
        fi

        # Extract the base version by stripping known Docker tag suffixes
        # from right to left: -dev, -amd64/-arm64, -sqlite/-postgres
        BASE_VERSION=$(echo "$TAG_NAME" \
            | sed -E 's/-(dev)$//' \
            | sed -E 's/-(amd64|arm64)$//' \
            | sed -E 's/-(sqlite|postgres)$//')

        # Check if this is a release version (strict semver: v1.2.3)
        if [[ "$BASE_VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "KEEP (release):    $TAG_NAME"
            KEPT_COUNT=$((KEPT_COUNT + 1))
            continue
        fi

        # Check age
        TAG_EPOCH=$(iso_to_epoch "$LAST_UPDATED")
        if [[ "$TAG_EPOCH" -gt "$CUTOFF_EPOCH" ]]; then
            echo "KEEP (recent):     $TAG_NAME  (updated: $LAST_UPDATED)"
            KEPT_COUNT=$((KEPT_COUNT + 1))
            continue
        fi

        # This tag should be deleted
        if [[ "$DRY_RUN" == "true" ]]; then
            echo "WOULD DELETE:      $TAG_NAME  (updated: $LAST_UPDATED)"
            DELETED_COUNT=$((DELETED_COUNT + 1))
        else
            echo "DELETING:          $TAG_NAME  (updated: $LAST_UPDATED)"
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
                -X DELETE "https://hub.docker.com/v2/repositories/${REPO}/tags/${TAG_NAME}/" \
                -H "Authorization: Bearer ${TOKEN}")
            if [[ "$HTTP_CODE" == "204" ]]; then
                echo "  -> Deleted successfully"
                DELETED_COUNT=$((DELETED_COUNT + 1))
            else
                echo "  -> WARNING: Delete returned HTTP $HTTP_CODE"
            fi
        fi

    done <<< "$TAGS"
done

echo ""
echo "=== Summary ==="
if [[ "$DRY_RUN" == "true" ]]; then
    echo "Tags that would be deleted: $DELETED_COUNT"
else
    echo "Tags deleted: $DELETED_COUNT"
fi
echo "Tags kept: $KEPT_COUNT"
