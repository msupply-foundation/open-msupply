#!/bin/bash
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

read -p "Architecture [1] amd64 (default)  [2] arm64: " ARCH_CHOICE
ARCH_CHOICE=${ARCH_CHOICE:-1}
case "$ARCH_CHOICE" in
  1) ARCH="amd64" ;;
  2) ARCH="arm64" ;;
  *) echo "Invalid choice"; exit 1 ;;
esac

read -p "Database [1] SQLite (default)  [2] Postgres: " DB_CHOICE
DB_CHOICE=${DB_CHOICE:-1}
case "$DB_CHOICE" in
  1) DB="sqlite" ;;
  2) DB="postgres" ;;
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

# --- Derived values ---

TAG_BASE="v${VERSION}-${DATE}-${DB}-${ARCH}"
TAG="${IMAGE}:${TAG_BASE}"
TAG_DEV="${IMAGE}:${TAG_BASE}-dev"

if [ "$DB" = "sqlite" ]; then
  RUST_IMAGE="rust:1.94-slim"
  BINARY_DIR="server/target/release"
  DOCKER_TARGET=""
  DOCKER_TARGET_DEV="dev"
  CARGO_FEATURES=""
  TARGET_DIR_FLAG=""
else
  RUST_IMAGE="rust:1.94"
  BINARY_DIR="server/target-postgres/release"
  DOCKER_TARGET="postgres"
  DOCKER_TARGET_DEV="postgres-dev"
  CARGO_FEATURES="--no-default-features --features postgres --target-dir target-postgres"
  TARGET_DIR_FLAG=""
fi

echo ""
echo "=== Build Configuration ==="
echo "  Architecture: $ARCH"
echo "  Database:     $DB"
echo "  Tag:          $TAG"
if [[ "$BUILD_DEV" =~ ^[Yy] ]]; then
  echo "  Tag (dev):    $TAG_DEV"
fi
echo "  Push:         $PUSH"
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

# --- Compile server ---

if [[ "$BUILD_SERVER" =~ ^[Yy] ]]; then
  echo "=== Compiling server ($DB, $ARCH) ==="

  if [ "$ARCH" = "arm64" ]; then
    # Native arm64 build
    docker run --rm --user "$(id -u)":"$(id -g)" \
      -v "$PWD":/usr/src/omsupply \
      -w /usr/src/omsupply/server \
      "$RUST_IMAGE" \
      cargo build --release --bin remote_server --bin remote_server_cli $CARGO_FEATURES

  else
    # Cross-compile for amd64 from native ARM container
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
else
  if [ ! -f "$BINARY_DIR/remote_server" ]; then
    echo "ERROR: Server binary not found at $BINARY_DIR/remote_server"
    echo "Compile the server first, or select 'Y' for Compile server."
    exit 1
  fi
  echo "=== Skipping server compile (using existing binary in $BINARY_DIR) ==="
fi

# --- Docker build ---

echo "=== Building Docker image ==="

PLATFORM_FLAG=""
if [ "$ARCH" = "amd64" ]; then
  PLATFORM_FLAG="--platform linux/amd64"
fi

TARGET_FLAG=""
if [ -n "$DOCKER_TARGET" ]; then
  TARGET_FLAG="--target $DOCKER_TARGET"
fi

docker build $PLATFORM_FLAG $TARGET_FLAG . -t "$TAG"
echo "Built: $TAG"

if [[ "$BUILD_DEV" =~ ^[Yy] ]]; then
  docker build $PLATFORM_FLAG --target "$DOCKER_TARGET_DEV" . -t "$TAG_DEV"
  echo "Built: $TAG_DEV"
fi

# --- Push ---

if [[ "$PUSH" =~ ^[Yy] ]]; then
  echo "=== Pushing to Docker Hub ==="
  docker login
  docker push "$TAG"
  echo "Pushed: $TAG"

  if [[ "$BUILD_DEV" =~ ^[Yy] ]]; then
    docker push "$TAG_DEV"
    echo "Pushed: $TAG_DEV"
  fi
fi

echo ""
echo "=== Done ==="
echo "Image: $TAG"
if [[ "$BUILD_DEV" =~ ^[Yy] ]]; then
  echo "Image: $TAG_DEV"
fi
