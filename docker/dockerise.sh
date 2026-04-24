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

cargo_features_for_db() {
  if [ "$1" = "postgres" ]; then
    echo "--no-default-features --features postgres"
  fi
}

# Each (db, arch) gets its own target directory to avoid cache conflicts
target_dir_for() {
  local DB="$1" ARCH="$2"
  if [ "$DB" = "sqlite" ] && [ "$ARCH" = "arm64" ]; then
    echo "target"
  elif [ "$DB" = "sqlite" ] && [ "$ARCH" = "amd64" ]; then
    echo "target-amd64"
  elif [ "$DB" = "postgres" ] && [ "$ARCH" = "arm64" ]; then
    echo "target-postgres"
  elif [ "$DB" = "postgres" ] && [ "$ARCH" = "amd64" ]; then
    echo "target-postgres-amd64"
  fi
}

# Where the Dockerfile expects to find binaries
dockerfile_binary_dir() {
  if [ "$1" = "sqlite" ]; then
    echo "server/target/release"
  else
    echo "server/target-postgres/release"
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
  local CURRENT_TAG="$1"
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

# Stage binaries from arch-specific target dir into the path the Dockerfile expects
stage_binaries() {
  local DB="$1" ARCH="$2"
  local TARGET_DIR=$(target_dir_for "$DB" "$ARCH")
  local DEST_DIR=$(dockerfile_binary_dir "$DB")

  if [ "$ARCH" = "arm64" ]; then
    local SRC="server/${TARGET_DIR}/release"
  else
    local SRC="server/${TARGET_DIR}/x86_64-unknown-linux-gnu/release"
  fi

  # If source and dest are the same, nothing to do (sqlite arm64 case)
  if [ "$SRC" = "$DEST_DIR" ]; then
    return 0
  fi

  mkdir -p "$DEST_DIR"
  cp "$SRC/remote_server" "$DEST_DIR/remote_server"
  cp "$SRC/remote_server_cli" "$DEST_DIR/remote_server_cli"
}

# --- Build result tracking ---

REPORT_LINES=""
SUCCESSFUL_TAGS=""

record_result() {
  local DB="$1" ARCH="$2" VARIANT="$3" STATUS="$4" TAG="$5"
  local LABEL
  if [ -n "$VARIANT" ]; then
    LABEL=$(printf "  %-10s %-10s %-6s" "$DB" "$ARCH" "$VARIANT")
  else
    LABEL=$(printf "  %-10s %-10s %-6s" "$DB" "$ARCH" "")
  fi
  if [ "$STATUS" = "OK" ]; then
    REPORT_LINES="${REPORT_LINES}${LABEL} OK     ${TAG}\n"
    SUCCESSFUL_TAGS="${SUCCESSFUL_TAGS} ${TAG}"
  else
    REPORT_LINES="${REPORT_LINES}${LABEL} FAIL   ${TAG}\n"
  fi
}

# --- Check for existing tags ---

declare -a ALL_TAGS=()
declare -a ALL_DBS=()
declare -a ALL_ARCHS=()
declare -a ALL_VARIANTS=()

for DB in "${DBS[@]}"; do
  for ARCH in "${ARCHS[@]}"; do
    TAG=$(make_tag "$DB" "$ARCH" "")
    TAG=$(check_existing_tag "$TAG")
    if [ "$TAG" = "STOPPED" ]; then echo "Stopped."; exit 0; fi
    ALL_TAGS+=("$TAG")
    ALL_DBS+=("$DB")
    ALL_ARCHS+=("$ARCH")
    ALL_VARIANTS+=("")

    if [[ "$BUILD_DEV" =~ ^[Yy] ]]; then
      TAG_DEV=$(make_tag "$DB" "$ARCH" "dev")
      TAG_DEV=$(check_existing_tag "$TAG_DEV")
      if [ "$TAG_DEV" = "STOPPED" ]; then echo "Stopped."; exit 0; fi
      ALL_TAGS+=("$TAG_DEV")
      ALL_DBS+=("$DB")
      ALL_ARCHS+=("$ARCH")
      ALL_VARIANTS+=("dev")
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

# --- Build client (fatal if fails — all variants depend on it) ---

if [[ "$BUILD_CLIENT" =~ ^[Yy] ]]; then
  echo "=== Building client ==="
  if ! (cd client && yarn && yarn build); then
    echo "ERROR: Client build failed. Aborting."
    exit 1
  fi
  cd "$REPO_ROOT"
else
  if [ ! -d "client/packages/host/dist" ]; then
    echo "ERROR: Client not built. Expected client/packages/host/dist to exist."
    echo "Run 'cd client && yarn && yarn build' first, or select 'Y' for Build client."
    exit 1
  fi
  echo "=== Skipping client build (using existing build in client/packages/host/dist) ==="
fi

# --- Compile, build, and push per (db, arch) combination ---

COMPILED=""

for i in "${!ALL_TAGS[@]}"; do
  TAG="${ALL_TAGS[$i]}"
  DB="${ALL_DBS[$i]}"
  ARCH="${ALL_ARCHS[$i]}"
  VARIANT="${ALL_VARIANTS[$i]}"
  KEY="${DB}-${ARCH}"

  # --- Compile (once per db+arch, skip for dev since it shares the same binary) ---

  if ! echo "$COMPILED" | grep -q "$KEY"; then
    if [[ "$BUILD_SERVER" =~ ^[Yy] ]]; then
      RUST_IMAGE=$(rust_image_for_db "$DB")
      CARGO_FEATURES=$(cargo_features_for_db "$DB")
      TARGET_DIR=$(target_dir_for "$DB" "$ARCH")
      TARGET_DIR_FLAG="--target-dir $TARGET_DIR"

      echo "=== Compiling server ($DB, $ARCH) ==="

      COMPILE_OK=true
      if [ "$ARCH" = "arm64" ]; then
        if ! docker run --rm --user "$(id -u)":"$(id -g)" \
          -v "$PWD":/usr/src/omsupply \
          -w /usr/src/omsupply/server \
          "$RUST_IMAGE" \
          cargo build --release --bin remote_server --bin remote_server_cli $CARGO_FEATURES $TARGET_DIR_FLAG; then
          COMPILE_OK=false
        fi
      else
        # Postgres cross-compile needs amd64 libpq-dev for linking
        CROSS_EXTRA_DEPS=""
        if [ "$DB" = "postgres" ]; then
          CROSS_EXTRA_DEPS="&& dpkg --add-architecture amd64 && apt-get update && apt-get install -y libpq-dev:amd64"
        fi

        if ! docker run --rm --platform linux/arm64 \
          -v "$PWD":/usr/src/omsupply \
          -w /usr/src/omsupply/server \
          "$RUST_IMAGE" bash -c "\
            apt-get update && apt-get install -y gcc-x86-64-linux-gnu libc6-dev-amd64-cross \
            $CROSS_EXTRA_DEPS && \
            rustup target add x86_64-unknown-linux-gnu && \
            CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER=x86_64-linux-gnu-gcc \
            PKG_CONFIG_PATH=/usr/lib/x86_64-linux-gnu/pkgconfig \
            PQ_LIB_DIR=/usr/lib/x86_64-linux-gnu \
              cargo build --release --target x86_64-unknown-linux-gnu $TARGET_DIR_FLAG --bin remote_server --bin remote_server_cli $CARGO_FEATURES && \
            chown -R $(id -u):$(id -g) $TARGET_DIR"; then
          COMPILE_OK=false
        fi
      fi

      if [ "$COMPILE_OK" = false ]; then
        echo "WARNING: Compilation failed for $DB $ARCH — skipping this variant."
        COMPILED="$COMPILED $KEY:FAIL"
      else
        COMPILED="$COMPILED $KEY:OK"
      fi
    else
      # Not compiling — check binary exists
      BINARY_DIR=$(dockerfile_binary_dir "$DB")
      if [ -f "$BINARY_DIR/remote_server" ]; then
        COMPILED="$COMPILED $KEY:OK"
      else
        echo "WARNING: Server binary not found at $BINARY_DIR/remote_server — marking as failed."
        COMPILED="$COMPILED $KEY:FAIL"
      fi
    fi
  fi

  # --- Check if compilation succeeded for this combo ---

  if echo "$COMPILED" | grep -q "$KEY:FAIL"; then
    echo "Skipping $TAG (compilation failed)"
    record_result "$DB" "$ARCH" "$VARIANT" "FAIL" "(compilation failed)"
    continue
  fi

  # --- Stage binaries and Docker build ---

  echo "=== Building Docker image: $TAG ==="

  # Copy binaries from arch-specific target dir to where Dockerfile expects them
  if [[ "$BUILD_SERVER" =~ ^[Yy] ]]; then
    if ! stage_binaries "$DB" "$ARCH"; then
      echo "WARNING: Failed to stage binaries for $TAG"
      record_result "$DB" "$ARCH" "$VARIANT" "FAIL" "(staging failed)"
      continue
    fi
  fi

  PLATFORM_FLAG=""
  if [ "$ARCH" = "amd64" ]; then
    PLATFORM_FLAG="--platform linux/amd64"
  fi

  DOCKER_TARGET=$(docker_target_for "$DB" "$VARIANT")
  TARGET_FLAG=""
  if [ -n "$DOCKER_TARGET" ]; then
    TARGET_FLAG="--target $DOCKER_TARGET"
  fi

  if docker build $PLATFORM_FLAG $TARGET_FLAG . -t "$TAG"; then
    echo "Built: $TAG"
    record_result "$DB" "$ARCH" "$VARIANT" "OK" "$TAG"

    # Push immediately if requested
    if [[ "$PUSH" =~ ^[Yy] ]]; then
      if docker push "$TAG"; then
        echo "Pushed: $TAG"
      else
        echo "WARNING: Failed to push $TAG"
      fi
    fi
  else
    echo "WARNING: Docker build failed for $TAG"
    record_result "$DB" "$ARCH" "$VARIANT" "FAIL" "(docker build failed)"
  fi
done

# --- Build Report ---

echo ""
echo "=== Build Report ==="
printf "$REPORT_LINES"

if [ -n "$SUCCESSFUL_TAGS" ]; then
  echo ""
  echo "Successfully built images:"
  for TAG in $SUCCESSFUL_TAGS; do
    echo "  $TAG"
  done
  exit 0
else
  echo ""
  echo "All builds failed."
  exit 1
fi
