#!/bin/bash
#
# Interactive Docker image build script for Open mSupply.
# Guides the user through building images for different architectures
# (amd64/arm64) and database backends (SQLite/Postgres).
#
# Usage: yarn dockerise
# Docs:  docs/content/docker/_index.md
#
# Authored by Claude Code (claude.ai/code)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

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

echo ""
echo "For Y/N prompts, the capitalised letter is the default."

read -p "Build client? [Y/n]: " BUILD_CLIENT
BUILD_CLIENT=${BUILD_CLIENT:-Y}

read -p "Compile server? [Y/n]: " BUILD_SERVER
BUILD_SERVER=${BUILD_SERVER:-Y}

read -p "Build dev image too? [y/N]: " BUILD_DEV
BUILD_DEV=${BUILD_DEV:-N}

read -p "Push to Docker Hub after build? [y/N]: " PUSH
PUSH=${PUSH:-N}

# --- Helper functions ---

rust_image_for_db() {
  if [ "$1" = "sqlite" ]; then
    echo "rust:1.94-slim"
  else
    echo "rust:1.94"
  fi
}

binary_dir_for_db() {
  if [ "$1" = "sqlite" ]; then
    echo "server/target/release"
  else
    echo "server/target-postgres/release"
  fi
}

cargo_features_for_db() {
  if [ "$1" = "postgres" ]; then
    echo "--no-default-features --features postgres --target-dir target-postgres"
  fi
}

docker_target_for() {
  local DB="$1" DEV="$2"
  if [ "$DB" = "sqlite" ]; then
    if [ "$DEV" = "dev" ]; then echo "dev"; else echo ""; fi
  else
    if [ "$DEV" = "dev" ]; then echo "postgres-dev"; else echo "postgres"; fi
  fi
}

make_tag() {
  local DB="$1" ARCH="$2" DEV="$3"
  local TAG_BASE="v${VERSION}-${DATE}-${DB}-${ARCH}"
  if [ "$DEV" = "dev" ]; then
    echo "${IMAGE}:${TAG_BASE}-dev"
  else
    echo "${IMAGE}:${TAG_BASE}"
  fi
}

check_existing_tag() {
  local CURRENT_TAG="$1" DB="$2" ARCH="$3"
  if docker image inspect "$CURRENT_TAG" > /dev/null 2>&1; then
    echo "" >&2
    echo "WARNING: Tag '$CURRENT_TAG' already exists locally." >&2
    TIMESTAMP=$(date +%H-%M-%S)
    ALT_TAG=$(echo "$CURRENT_TAG" | sed "s/${DATE}/${DATE}_${TIMESTAMP}/")
    echo "  [1] Continue & overwrite" >&2
    echo "  [2] Stop script" >&2
    echo "  [3] Use alternative tag (default: $ALT_TAG)" >&2
    read -p "Choice [1/2/3]: " TAG_CHOICE
    case "$TAG_CHOICE" in
      1) ;; # continue with existing tag
      2) echo "STOPPED" ; exit 0 ;;
      3)
        read -p "Tag name [$ALT_TAG]: " CUSTOM_TAG
        CURRENT_TAG="${CUSTOM_TAG:-$ALT_TAG}"
        ;;
      *) echo "Invalid choice" >&2; exit 1 ;;
    esac
  fi
  echo "$CURRENT_TAG"
}

# --- Check for existing tags and build tag list ---

declare -a ALL_TAGS=()
declare -a ALL_TARGETS=()
declare -a ALL_ARCHS_FOR_TAG=()

for DB in "${DBS[@]}"; do
  for ARCH in "${ARCHS[@]}"; do
    TAG=$(make_tag "$DB" "$ARCH" "")
    TAG=$(check_existing_tag "$TAG" "$DB" "$ARCH")
    if [ "$TAG" = "STOPPED" ]; then echo "Stopped."; exit 0; fi
    ALL_TAGS+=("$TAG")
    ALL_TARGETS+=("$(docker_target_for "$DB" "")")
    ALL_ARCHS_FOR_TAG+=("$ARCH")

    if [[ "$BUILD_DEV" =~ ^[Yy] ]]; then
      TAG_DEV=$(make_tag "$DB" "$ARCH" "dev")
      TAG_DEV=$(check_existing_tag "$TAG_DEV" "$DB" "$ARCH")
      if [ "$TAG_DEV" = "STOPPED" ]; then echo "Stopped."; exit 0; fi
      ALL_TAGS+=("$TAG_DEV")
      ALL_TARGETS+=("$(docker_target_for "$DB" "dev")")
      ALL_ARCHS_FOR_TAG+=("$ARCH")
    fi
  done
done

# --- Show build configuration ---

echo ""
echo "=== Build Configuration ==="
echo "  Architecture: ${ARCHS[*]}"
echo "  Database:     ${DBS[*]}"
echo "  Images to build:"
for TAG in "${ALL_TAGS[@]}"; do
  echo "    $TAG"
done
echo "  Push: $PUSH"
echo ""

# --- Build client ---

if [[ "$BUILD_CLIENT" =~ ^[Yy] ]]; then
  echo "=== Building client ==="
  cd client && yarn && yarn build
  cd "$REPO_ROOT"
else
  if [ ! -d "client/packages/host/dist" ]; then
    echo "ERROR: Client not built. Expected client/packages/host/dist to exist."
    echo "Run 'cd client && yarn && yarn build' first, or select 'Y' for Build client."
    exit 1
  fi
  echo "=== Skipping client build (using existing build in client/packages/host/dist) ==="
fi

# --- Compile server binaries ---

if [[ "$BUILD_SERVER" =~ ^[Yy] ]]; then
  # Deduplicate: compile once per (db, arch) combination
  COMPILED=""
  for DB in "${DBS[@]}"; do
    for ARCH in "${ARCHS[@]}"; do
      KEY="${DB}-${ARCH}"
      if echo "$COMPILED" | grep -q "$KEY"; then continue; fi
      COMPILED="$COMPILED $KEY"

      RUST_IMAGE=$(rust_image_for_db "$DB")
      CARGO_FEATURES=$(cargo_features_for_db "$DB")

      echo "=== Compiling server ($DB, $ARCH) ==="

      if [ "$ARCH" = "arm64" ]; then
        docker run --rm --user "$(id -u)":"$(id -g)" \
          -v "$PWD":/usr/src/omsupply \
          -w /usr/src/omsupply/server \
          "$RUST_IMAGE" \
          cargo build --release --bin remote_server --bin remote_server_cli $CARGO_FEATURES
      else
        if [ "$DB" = "postgres" ]; then
          CROSS_TARGET_DIR="target-postgres-amd64"
          RELEASE_DIR="target-postgres/release"
        else
          CROSS_TARGET_DIR="target-amd64"
          RELEASE_DIR="target/release"
        fi

        docker run --rm --platform linux/arm64 \
          -v "$PWD":/usr/src/omsupply \
          -w /usr/src/omsupply/server \
          "$RUST_IMAGE" bash -c "\
            apt-get update && apt-get install -y gcc-x86-64-linux-gnu libc6-dev-amd64-cross && \
            rustup target add x86_64-unknown-linux-gnu && \
            CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER=x86_64-linux-gnu-gcc \
              cargo build --release --target x86_64-unknown-linux-gnu --target-dir $CROSS_TARGET_DIR --bin remote_server --bin remote_server_cli $CARGO_FEATURES && \
            mkdir -p $RELEASE_DIR && \
            cp $CROSS_TARGET_DIR/x86_64-unknown-linux-gnu/release/remote_server $RELEASE_DIR/remote_server && \
            cp $CROSS_TARGET_DIR/x86_64-unknown-linux-gnu/release/remote_server_cli $RELEASE_DIR/remote_server_cli && \
            chown -R $(id -u):$(id -g) $RELEASE_DIR"
      fi
    done
  done
else
  # Validate all required binaries exist
  for DB in "${DBS[@]}"; do
    BINARY_DIR=$(binary_dir_for_db "$DB")
    if [ ! -f "$BINARY_DIR/remote_server" ]; then
      echo "ERROR: Server binary not found at $BINARY_DIR/remote_server"
      echo "Compile the server first, or select 'Y' for Compile server."
      exit 1
    fi
  done
  echo "=== Skipping server compile (using existing binaries) ==="
fi

# --- Docker build ---

echo "=== Building Docker images ==="

for i in "${!ALL_TAGS[@]}"; do
  TAG="${ALL_TAGS[$i]}"
  TARGET="${ALL_TARGETS[$i]}"
  ARCH="${ALL_ARCHS_FOR_TAG[$i]}"

  PLATFORM_FLAG=""
  if [ "$ARCH" = "amd64" ]; then
    PLATFORM_FLAG="--platform linux/amd64"
  fi

  TARGET_FLAG=""
  if [ -n "$TARGET" ]; then
    TARGET_FLAG="--target $TARGET"
  fi

  docker build $PLATFORM_FLAG $TARGET_FLAG . -t "$TAG"
  echo "Built: $TAG"
done

# --- Push ---

if [[ "$PUSH" =~ ^[Yy] ]]; then
  echo "=== Pushing to Docker Hub ==="
  docker login
  for TAG in "${ALL_TAGS[@]}"; do
    docker push "$TAG"
    echo "Pushed: $TAG"
  done
fi

echo ""
echo "=== Done ==="
for TAG in "${ALL_TAGS[@]}"; do
  echo "Image: $TAG"
done
