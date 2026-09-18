#!/bin/bash
#
# Interactive Docker image build script for Open mSupply.
# Guides the user through building images for different architectures
# (amd64/arm64) and database backends (SQLite/Postgres).
#
# Usage: yarn dockerise
# Docs:  docs/content/docker/_index.md
#
# The server and both frontends are compiled inside the Dockerfile, so this
# script no longer orchestrates a build - it collects choices and calls
# `docker buildx build` once per variant. The old "Build client?" and "Compile
# server?" prompts are gone with the steps they controlled: skipping them used
# to mean reusing whatever happened to be in client/packages/host/dist and
# server/target, which is exactly the stale-artifact trap the single Dockerfile
# removes. BuildKit's cache makes an unchanged rebuild cheap without it.
#
# Authored by Claude Code (claude.ai/code)

set -e

# `buildx build` is required, not just `build`: the Dockerfile uses cache mounts
# and $BUILDPLATFORM pinning. buildx is a CLI plugin and can go missing - a
# stale symlink in ~/.docker/cli-plugins left by an uninstalled Docker Desktop
# or OrbStack shadows the working one, and docker then parses --target as a
# top-level flag, so the failure reads "unknown flag: --target" against docker's
# own usage rather than anything about buildx.
#
# Not on Docker? This script wants a `docker` on PATH that speaks buildx.
# Podman needs a wrapper for that regardless, since buildah rejects the
# Dockerfile's sharing=private cache mounts and supplies no BUILDARCH.
if ! docker buildx version &> /dev/null; then
  echo "ERROR: 'docker buildx' is unavailable, so the image cannot be built."
  echo ""
  echo "  Check for dangling plugin symlinks:"
  echo "    ls -la ~/.docker/cli-plugins/"
  echo "  Remove any pointing at an app you have uninstalled, then re-run."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Verify we're in the repo root
if [ ! -f "package.json" ] || [ ! -f "Dockerfile" ]; then
  echo "ERROR: Could not locate repo root. Expected package.json and Dockerfile in $REPO_ROOT"
  echo "Run this script from the repository root with: yarn dockerise"
  exit 1
fi

# Derive version tag from package.json + current date
VERSION=$(node -p "require('./package.json').version")
DATE=$(date +%Y-%m-%d)
IMAGE="msupplyfoundation/omsupply"

echo "=== Open mSupply Dockerise ==="
echo ""
echo "Version: $VERSION"
echo "Date: $DATE"
echo ""
echo "Press Enter at any prompt to accept the default option."
echo ""

# --- Prompts ---

read -p "Architecture [1] amd64 (default)  [2] arm64  [3] both: " ARCH_CHOICE
ARCH_CHOICE=${ARCH_CHOICE:-1}
case "$ARCH_CHOICE" in
  1) ARCHS=("amd64") ;;
  2) ARCHS=("arm64") ;;
  3) ARCHS=("amd64" "arm64") ;;
  *) echo "Invalid choice"; exit 1 ;;
esac

read -p "Database [1] SQLite (default)  [2] Postgres  [3] both: " DB_CHOICE
DB_CHOICE=${DB_CHOICE:-1}
case "$DB_CHOICE" in
  1) DBS=("sqlite") ;;
  2) DBS=("postgres") ;;
  3) DBS=("sqlite" "postgres") ;;
  *) echo "Invalid choice"; exit 1 ;;
esac

# Debug is offered because skipping the optimisation pass makes it the cheap way
# to check an image change end to end. It is NOT a shippable image: unoptimised,
# and unstripped where release sets strip = true. The tag carries a -debug
# suffix so one can never be mistaken for a release build of the same version,
# here or on Docker Hub.
read -p "Cargo profile [1] release (default)  [2] debug (faster build, unoptimised): " PROFILE_CHOICE
PROFILE_CHOICE=${PROFILE_CHOICE:-1}
case "$PROFILE_CHOICE" in
  1) CARGO_PROFILE="release" ;;
  2) CARGO_PROFILE="debug" ;;
  *) echo "Invalid choice"; exit 1 ;;
esac

echo ""
echo "For Y/N prompts, the capitalised letter is the default."

read -p "Build dev image too? [y/N]: " BUILD_DEV
BUILD_DEV=${BUILD_DEV:-N}

read -p "Push to Docker Hub after build? [y/N]: " PUSH
PUSH=${PUSH:-N}

# --- Build ---

echo ""
echo "=== Build Configuration ==="
echo "  Architectures: ${ARCHS[*]}"
echo "  Databases:     ${DBS[*]}"
echo "  Dev image:     $BUILD_DEV"
echo "  Cargo profile: $CARGO_PROFILE"
echo "  Push:          $PUSH"
echo ""

if [[ "$PUSH" =~ ^[Yy]$ ]]; then
  echo "=== Logging in to Docker Hub ==="
  docker login
fi

BUILT_TAGS=()

for DB in "${DBS[@]}"; do
  for ARCH in "${ARCHS[@]}"; do

    # The v prefix matches the git tags CI names its images after (v2.19.1-...).
    TAG="${IMAGE}:v${VERSION}-${DATE}-${DB}-${ARCH}"
    [ "$CARGO_PROFILE" = "release" ] || TAG="${TAG}-${CARGO_PROFILE}"

    # Warn rather than silently overwrite a tag built earlier today.
    if docker image inspect "$TAG" > /dev/null 2>&1; then
      echo ""
      echo "WARNING: Tag '$TAG' already exists locally and will be overwritten."
      read -p "Continue? [Y/n]: " OVERWRITE
      OVERWRITE=${OVERWRITE:-Y}
      [[ "$OVERWRITE" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
    fi

    echo ""
    echo "=== Building $DB / $ARCH ==="
    echo "    $TAG"

    # One command builds everything: the server (cross-compiled natively for
    # the target arch), both frontends, and the runtime image. BuildKit skips
    # any stage this target does not need.
    docker buildx build \
      --target "$DB" \
      --platform "linux/${ARCH}" \
      --build-arg "CARGO_PROFILE=${CARGO_PROFILE}" \
      --load \
      -t "$TAG" \
      .
    BUILT_TAGS+=("$TAG")

    if [[ "$BUILD_DEV" =~ ^[Yy]$ ]]; then
      if [ "$DB" = "sqlite" ]; then DEV_TARGET="dev"; else DEV_TARGET="postgres-dev"; fi
      DEV_TAG="${TAG}-dev"
      echo ""
      echo "=== Building $DB / $ARCH (dev) ==="
      echo "    $DEV_TAG"
      docker buildx build \
        --target "$DEV_TARGET" \
        --platform "linux/${ARCH}" \
        --build-arg "CARGO_PROFILE=${CARGO_PROFILE}" \
        --load \
        -t "$DEV_TAG" \
        .
      BUILT_TAGS+=("$DEV_TAG")
    fi

  done
done

if [[ "$PUSH" =~ ^[Yy]$ ]]; then
  echo ""
  echo "=== Pushing ==="
  for T in "${BUILT_TAGS[@]}"; do
    echo "  $T"
    docker push "$T"
  done
fi

echo ""
echo "=== Done ==="
for T in "${BUILT_TAGS[@]}"; do
  echo "  $T"
done
if [ ${#BUILT_TAGS[@]} -gt 0 ]; then
  echo ""
  echo "Run one with:"
  echo "  docker run --rm -p 8000:8000 ${BUILT_TAGS[0]}"
fi
