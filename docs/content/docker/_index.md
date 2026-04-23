+++
title = "Open omSupply Docker"
weight = 40
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Open omSupply Docker

## Quick start

An interactive build script is available that handles the full pipeline (client build, server compile, Docker image build, and optional push):

```bash
yarn dockerise
```

It will prompt you for architecture (amd64/arm64/both), database (SQLite/Postgres/both), and which steps to run. Press Enter at each prompt to accept the defaults. Selecting "both" for architecture or database will compile all variants first, then build all Docker images.

<div class="alert alert-warning">
<strong>Note:</strong> This script currently assumes it is being run on an ARM host (e.g. Apple Silicon Mac). Cross-compilation targets are set up accordingly. If you are running on a native amd64 Linux system, use the manual build instructions below instead.
</div>

<!--
To-Do: if we find we need to run this script on a Linux machine, we should update the script to
auto-detect the current system and modify cross-compilation instructions accordingly
-->


The rest of this page documents the CI pipeline and manual steps if you need more control over the process.

## CI/CD (GitHub Actions)

The `dockerise.yaml` workflow fires automatically when a tag starting with `v` is pushed:

```bash
git tag v2.8.0
git push origin v2.8.0
```

It builds Docker images for all combinations of database (SQLite/Postgres) and architecture (amd64/arm64), then pushes them to Docker Hub.

### How it works

1. **Build client** — installs Node dependencies and runs `yarn build`
2. **Build server** (4 parallel jobs) — compiles `remote_server` and `remote_server_cli` for each (db, arch) combination:
   - **amd64** builds run natively on the amd64 GitHub runner
   - **arm64** builds use cross-compilation (`gcc-aarch64-linux-gnu`) from the amd64 runner, which is much faster than QEMU emulation
   - **Postgres** builds use `rust:1.94` (includes `libpq-dev`), SQLite builds use `rust:1.94-slim`
3. **Dockerise** (4 parallel jobs) — builds and pushes Docker images using the compiled binaries
4. **Trigger plugin tests** — runs downstream plugin test suite against the new images

### Image tags

Images are pushed to `msupplyfoundation/omsupply` with the naming convention:

| Tag | Example |
| --- | ------- |
| `v{version}-{db}-{arch}` | `v2.8.0-sqlite-amd64` |
| `v{version}-{db}-{arch}-dev` | `v2.8.0-sqlite-amd64-dev` |

Dev images (which include Node/Yarn and the client source for frontend development) are only built for amd64.

### Requirements

- Docker Hub credentials must be configured as repository secrets: `DOCKER_USERNAME` and `DOCKER_TOKEN`
- The `ORG_WORKFLOW_TOKEN` secret is needed for triggering downstream plugin tests

### Testing the workflow

To test without creating a real release, push a test tag and delete it afterwards:

```bash
git tag v0.0.0-test
git push origin v0.0.0-test
# After verifying the workflow runs correctly:
git tag -d v0.0.0-test
git push origin :refs/tags/v0.0.0-test
```

## Manual build

The Dockerfile has two pre-requisites: `remote_server` and `remote_server_cli` built in release mode (after building the client).

If building on a non-Linux host (e.g. macOS), use a Docker container to cross-compile a Linux binary. The `-v` flag mounts your source code into the container and the compiled binary is written back to your host filesystem.

If building natively on Linux, you can use `cargo build` directly.

### SQLite (default)

Via Docker (for macOS or other non-Linux hosts — uses `rust:1.94-slim` since SQLite is compiled from source and needs no system libraries):

```bash
docker run --rm --user "$(id -u)":"$(id -g)" -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/server rust:1.94-slim cargo build --release --bin remote_server --bin remote_server_cli
```

Native Linux:

```bash
cd server && cargo build --release --bin remote_server --bin remote_server_cli
```

### Postgres

Via Docker (for macOS or other non-Linux hosts — uses `rust:1.94` non-slim because it includes `libpq-dev`):

```bash
docker run --rm --user "$(id -u)":"$(id -g)" -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/server rust:1.94 cargo build --release --bin remote_server --bin remote_server_cli --no-default-features --features postgres --target-dir target-postgres
```

Native Linux (requires `libpq-dev` installed, e.g. `apt-get install libpq-dev`):

```bash
cd server && cargo build --release --bin remote_server --bin remote_server_cli --no-default-features --features postgres --target-dir target-postgres
```

**Important:** When using Docker, the rust image version must match the version in the Dockerfile (`rust:1.94-slim`) to avoid glibc version mismatches.

[docker-hub.md](./docker-hub.md) explains the feature set of the docker image.

`entry.sh` calls cli before starting server or allows use of cli as an argument.

`entry-postgres.sh` starts an embedded PostgreSQL instance, optionally imports a dump file, then hands off to `entry.sh`.

## Docker targets

| Target         | Database | Description                                                            |
| -------------- | -------- | ---------------------------------------------------------------------- |
| `sqlite`       | SQLite   | Default runtime image                                                  |
| `dev`          | SQLite   | Includes client with Node/Yarn for frontend development                |
| `postgres`     | Postgres | Runtime image with embedded PostgreSQL server                          |
| `postgres-dev` | Postgres | Embedded PostgreSQL with client and Node/Yarn for frontend development |

## Building image locally

By default, `docker build` produces an image matching your host architecture. On Apple Silicon Macs this means `linux/arm64`, which won't run on typical x86_64 Linux servers. Use `--platform linux/amd64` on **both** the cargo compile step and the `docker build` step to produce an amd64 image.

### SQLite

#### For linux/amd64 servers (built on Apple Silicon Mac)

QEMU cannot reliably emulate `rustc` on Apple Silicon, so we cross-compile from a native ARM container instead. The `docker build` step still uses `--platform linux/amd64` to get the correct base image layers.

```bash
# Build client
cd client && yarn && yarn build
# Cross-compile server for amd64 from native ARM container
cd ../ && docker run --rm --platform linux/arm64 -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/server rust:1.94-slim bash -c "\
  apt-get update && apt-get install -y gcc-x86-64-linux-gnu libc6-dev-amd64-cross && \
  rustup target add x86_64-unknown-linux-gnu && \
  CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER=x86_64-linux-gnu-gcc \
    cargo build --release --target x86_64-unknown-linux-gnu --target-dir target-amd64 --bin remote_server --bin remote_server_cli && \
  mkdir -p target/release && \
  cp target-amd64/x86_64-unknown-linux-gnu/release/remote_server target/release/remote_server && \
  cp target-amd64/x86_64-unknown-linux-gnu/release/remote_server_cli target/release/remote_server_cli && \
  chown -R $(id -u):$(id -g) target/release"
# Dockerise with tag
docker build --platform linux/amd64 . -t msupplyfoundation/omsupply:v2.7.3 && \
docker build --platform linux/amd64 . -t msupplyfoundation/omsupply:v2.7.3-dev --target dev
# "docker hub" in bitwarden
docker login
docker push msupplyfoundation/omsupply:v2.7.3 && \
docker push msupplyfoundation/omsupply:v2.7.3-dev
```

#### For Apple Silicon (arm64) Macs

```bash
# Build client
cd client && yarn && yarn build
# Build server (native arm64)
cd ../ && docker run --rm --user "$(id -u)":"$(id -g)" -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/server rust:1.94-slim cargo build --release --bin remote_server --bin remote_server_cli
# Dockerise with tag
docker build . -t msupplyfoundation/omsupply:v2.7.3-arm64 && \
docker build . -t msupplyfoundation/omsupply:v2.7.3-arm64-dev --target dev
# "docker hub" in bitwarden
docker login
docker push msupplyfoundation/omsupply:v2.7.3-arm64 && \
docker push msupplyfoundation/omsupply:v2.7.3-arm64-dev
```

### Postgres

#### For linux/amd64 servers (built on Apple Silicon Mac)

Same cross-compilation approach as SQLite above:

```bash
# Build client
cd client && yarn && yarn build
# Cross-compile server for amd64 with postgres feature
cd ../ && docker run --rm --platform linux/arm64 -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/server rust:1.94 bash -c "\
  apt-get update && apt-get install -y gcc-x86-64-linux-gnu libc6-dev-amd64-cross && \
  rustup target add x86_64-unknown-linux-gnu && \
  CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER=x86_64-linux-gnu-gcc \
    cargo build --release --target x86_64-unknown-linux-gnu --target-dir target-postgres-amd64 --bin remote_server --bin remote_server_cli --no-default-features --features postgres && \
  mkdir -p target-postgres/release && \
  cp target-postgres-amd64/x86_64-unknown-linux-gnu/release/remote_server target-postgres/release/remote_server && \
  cp target-postgres-amd64/x86_64-unknown-linux-gnu/release/remote_server_cli target-postgres/release/remote_server_cli && \
  chown -R $(id -u):$(id -g) target-postgres/release"
# Dockerise with tag
docker build --platform linux/amd64 . -t msupplyfoundation/omsupply:v2.7.3-postgres --target postgres && \
docker build --platform linux/amd64 . -t msupplyfoundation/omsupply:v2.7.3-postgres-dev --target postgres-dev
# "docker hub" in bitwarden
docker login
docker push msupplyfoundation/omsupply:v2.7.3-postgres && \
docker push msupplyfoundation/omsupply:v2.7.3-postgres-dev
```

#### For Apple Silicon (arm64) Macs

```bash
# Build client
cd client && yarn && yarn build
# Build server with postgres feature (native arm64)
cd ../ && docker run --rm --user "$(id -u)":"$(id -g)" -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/server rust:1.94 cargo build --release --bin remote_server --bin remote_server_cli --no-default-features --features postgres --target-dir target-postgres
# Dockerise with tag
docker build . -t msupplyfoundation/omsupply:v2.7.3-arm64-postgres --target postgres && \
docker build . -t msupplyfoundation/omsupply:v2.7.3-arm64-postgres-dev --target postgres-dev
# "docker hub" in bitwarden
docker login
docker push msupplyfoundation/omsupply:v2.7.3-arm64-postgres && \
docker push msupplyfoundation/omsupply:v2.7.3-arm64-postgres-dev
```

## Running the images

### SQLite

Basic usage:

```bash
docker run -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

To mount an existing SQLite database, mount the **folder** containing the `.sqlite` file to `/database`. The database file must be named `omsupply-database.sqlite` (or override the name with `APP_DATABASE__DATABASE_NAME`):

```bash
docker run -v "/path/to/folder":/database -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

To load reference data (bundled demo/test datasets in `server/data/`, useful for demos and testing — not for production data):

```bash
docker run -e LOAD_REFERENCE_FILE=reference1 -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

### Postgres

The postgres image runs its own PostgreSQL server inside the container. Basic usage (starts with an empty database):

```bash
docker run -p 9000:8000 msupplyfoundation/omsupply:v2.7.3-postgres
```

To import an existing database dump (`pg_dump --format custom`) on launch, mount the dump file to `/database/import.dump`:

```bash
docker run -v /path/to/my_dump.dump:/database/import.dump -p 9000:8000 \
  msupplyfoundation/omsupply:v2.7.3-postgres
```

The database name can be overridden via environment variable:

```bash
docker run -v /path/to/my_dump.dump:/database/import.dump -p 9000:8000 \
  -e APP_DATABASE__DATABASE_NAME="my-database" \
  msupplyfoundation/omsupply:v2.7.3-postgres
```

### Configuration overrides

All configuration values can be overridden via environment variables using the `APP_` prefix with `__` for nesting. See [example.yaml](../server/configuration/example.yaml) for all available options.

```bash
docker run -p 9000:8000 \
  -e APP_DATABASE__DATABASE_NAME="custom-name" \
  -e APP_DATABASE__HOST="custom-host" \
  msupplyfoundation/omsupply:v2.7.3
```