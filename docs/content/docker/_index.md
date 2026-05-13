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

The workflow distinguishes between **release tags** and **non-release tags**:

| Tag type    | Pattern                                    | Examples                                                             | What gets built                                       |
| ----------- | ------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------- |
| Release     | `v{major}.{minor}.{patch}` (strict semver) | `v2.19.1`, `v2.8.0`                                                  | All variants: amd64 + arm64, dev images, plugin tests |
| Non-release | Anything else starting with `v`            | `v2.18.00-develop-04160443`, `v2.17.03-RC-04161543`, `v2.18.00-test` | amd64 only, no dev images, no plugin tests            |

Non-release tags are typically created automatically by the nightly build process for develop and RC branches. Since these images are primarily used for testing on amd64 servers, skipping arm64 and dev builds saves significant CI time.

### How it works

1. **Check tag** — determines if the tag is a release or non-release
2. **Build client** — installs Node dependencies and runs `yarn build`
3. **Build server** (2 or 4 parallel jobs) — compiles `remote_server` and `remote_server_cli` for each (db, arch) combination:
   - **amd64** builds run natively on the amd64 GitHub runner
   - **arm64** builds use cross-compilation (`gcc-aarch64-linux-gnu`) from the amd64 runner, which is much faster than QEMU emulation (release tags only)
   - **Postgres** builds use `rust:1.94` (includes `libpq-dev`), SQLite builds use `rust:1.94-slim`
4. **Dockerise** (2 or 4 parallel jobs) — builds and pushes Docker images using the compiled binaries
5. **Trigger plugin tests** — runs downstream plugin test suite against the new dev images (release tags only)

### Image tags

Images are pushed to `msupplyfoundation/omsupply` with the naming convention:

| Tag                          | Example                   | When built        |
| ---------------------------- | ------------------------- | ----------------- |
| `v{version}-{db}-{arch}`     | `v2.8.0-sqlite-amd64`     | All tags          |
| `v{version}-{db}-{arch}-dev` | `v2.8.0-sqlite-amd64-dev` | Release tags only |

Dev images (which include Node/Yarn and the client source for frontend development) are only built for amd64 on release tags.

### Docker Hub cleanup

A separate `cleanup-docker-tags.yaml` workflow runs nightly to remove old non-release images from Docker Hub. Release images are always kept. Non-release images older than 30 days (configurable) are deleted.

The cleanup script can also be run locally:

```bash
export DOCKER_USERNAME=myuser
export DOCKER_TOKEN=mytoken
# Preview what would be deleted (no actual deletions)
bash .github/scripts/cleanup-docker-tags.sh --dry-run
# Delete non-release tags older than 14 days
bash .github/scripts/cleanup-docker-tags.sh --max-age-days 14
```

Run `bash .github/scripts/cleanup-docker-tags.sh --help` for all options.

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

Since `v0.0.0-test` is a non-release tag, this will only build the amd64 variants (no arm64, no dev images).

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

<div class="alert alert-info">
<strong>Apple Silicon note:</strong> on M-series Macs, add <code>--platform linux/amd64</code> to the first <code>docker run</code> (or <code>docker pull</code>) for amd64 images, or use an <code>-arm64</code> tag where available. This applies to every <code>docker run</code> example on this page.
</div>

### SQLite

Basic usage:

```bash
docker run -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

To mount an existing SQLite database, mount the **folder** (directory) containing the `.sqlite` file to `/database` — `/database` is a directory mount, not a file mount. The database file inside that folder must be named `omsupply-database.sqlite` (or override the name with `APP_DATABASE__DATABASE_NAME`):

```bash
docker run -v "/path/to/folder":/database -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

To load reference data (bundled demo/test datasets in `server/data/`, useful for demos and testing — not for production data):

```bash
docker run -e LOAD_REFERENCE_FILE=reference1 -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

### Postgres

The postgres image runs its own PostgreSQL server inside the container. The container uses two mount points:

- `/database` — **directory** mount for persistent state. The postgres data directory lives at `/database/postgres/data`. Mount a host directory or named volume here to persist across container recreations.
- `/import.dump` — optional **file** mount for a single `pg_dump --format custom` dump file. If present at startup, it's restored into the database before the server starts.

Basic usage (ephemeral — empty database, lost when the container is removed):

```bash
docker run -p 9000:8000 msupplyfoundation/omsupply:v2.7.3-postgres
```

To import an existing database dump on launch (still ephemeral):

```bash
docker run -v /path/to/my_dump.dump:/import.dump -p 9000:8000 \
  msupplyfoundation/omsupply:v2.7.3-postgres
```

For production / persistent deployments, mount a host directory at `/database`:

```bash
docker run -v /path/to/data-dir:/database -p 9000:8000 \
  msupplyfoundation/omsupply:v2.7.3-postgres
```

To seed a persistent deployment from a dump on first run, combine both mounts. Remove the `-v .../import.dump` mount on subsequent runs — otherwise the dump will be re-imported every restart on top of the existing data:

```bash
docker run -v /path/to/data-dir:/database \
  -v /path/to/my_dump.dump:/import.dump \
  -p 9000:8000 \
  msupplyfoundation/omsupply:v2.7.3-postgres
```

The database name can be overridden via environment variable:

```bash
docker run -v /path/to/data-dir:/database \
  -v /path/to/my_dump.dump:/import.dump \
  -p 9000:8000 \
  -e APP_DATABASE__DATABASE_NAME="my-database" \
  msupplyfoundation/omsupply:v2.7.3-postgres
```

### Hardware id

The hardware id is used to verify a connection is coming from the same host on the central server. Without a stable id, a copied or restored database could accidentally sync as if it were the original site.

By default, if `/etc/machine-id` is not mounted, the container generates a fresh UUID on every start. This means each new container instance has a unique hardware id — a logical database dump restored into a fresh container will automatically get a different id and the central server will detect the mismatch.

This is fine for ephemeral or short-lived deployments. For production use where the container may be recreated (e.g. after an upgrade), mount a stable id file so the site identity is preserved across restarts.

<div class="alert alert-warning">
<strong>Important — this is a file mount, not a folder mount.</strong> <code>/etc/machine-id</code> inside the container is a single file. Docker bind-mounts create whatever the host source path is missing, so if no <code>machine-id</code> file exists on the host, Docker will silently create a <strong>directory</strong> at that path and the container will fail to start (or behave incorrectly) because it expects a file. <strong>Always create the host-side file first</strong> with <code>touch machine-id</code> (or by writing a value into it) before running <code>docker run</code>.
</div>

There are two ways to use the mount:

**Option A — pre-generate the id on the host.** Write a UUID into the file before first run; the container uses it as-is and never overwrites it:

```bash
# Linux:
cat /proc/sys/kernel/random/uuid > machine-id
# macOS:
uuidgen | tr '[:upper:]' '[:lower:]' > machine-id


docker run -v /path/to/data-dir:/database \
  -v "$(pwd)/machine-id":/etc/machine-id:ro \
  -p 9000:8000 \
  msupplyfoundation/omsupply:v2.7.3
```

**Option B — let the container generate and persist the id.** Create an empty file with `touch`, then mount it read-write (no `:ro`). On first run the container writes a fresh UUID into the mounted file; subsequent runs reuse it:

```bash
touch machine-id   # MUST exist before docker run — see warning above
docker run -v /path/to/data-dir:/database \
  -v "$(pwd)/machine-id":/etc/machine-id \
  -p 9000:8000 \
  msupplyfoundation/omsupply:v2.7.3
```

Either way, keep this file separate from the `/database` volume — a database dump does not contain it, so a restored dump on a new deployment will generate a fresh id as expected.

**Option C - use the host's own machine-id (not recommended if you have multiple deployments on the same host).**

On Linux you can bind-mount the host's own `/etc/machine-id` to tie the deployment to that machine (only suitable if you have one deployment per host, otherwise multiple containers on the same host will share a hardware id):

```bash
docker run -v /path/to/data-dir:/database \
  -v /etc/machine-id:/etc/machine-id:ro \
  -p 9000:8000 \
  msupplyfoundation/omsupply:v2.7.3
```

For macOS you can generate a `machine-id` file from the host's `IOPlatformUUID`:

```bash
ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { print $3 }' | tr -d '"' > machine-id
```

### Running CLI commands

The image also exposes `remote_server_cli` — pass arguments after the image name and the container runs the CLI instead of starting the server. For example, to export the GraphQL schema to a host folder:

```bash
docker run --rm -v "$(pwd)/putschemahere":/schemafolder \
  msupplyfoundation/omsupply:v2.7.3 export-graphql-schema -p /schemafolder/schema.graphql
```

Pass `--help` instead of a subcommand to list the available CLI commands.

### Date imitation

For tests and stable demos it can be useful to shift or pin the server's idea of "now".

`SHOULD_REFRESH_DATES` rolls every date in the loaded database forward so the most recent date becomes today:

```bash
docker run -e LOAD_REFERENCE_FILE=reference1 -e SHOULD_REFRESH_DATES=true \
  -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

`FAKETIME` pins the server clock to a specific date/time. This does **not** affect dates generated in the front end (e.g. cold-chain default filters, dashboard date ranges):

```bash
docker run -e LOAD_REFERENCE_FILE=reference1 -e FAKETIME="@2023-05-20 11:30:00" \
  -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

### Dev image

The `-dev` flavour bundles Node, Yarn, and the client source with dependencies pre-installed, so you can work on the front end against a running server. Make sure your host-side `clientdev` folder is empty first.

Copy the client source onto the host (may take a few minutes):

```bash
docker run --rm -v "$(pwd)/clientdev":/usr/src/omsupply/clientcopy \
  -ti --entrypoint="/bin/bash" -w /usr/src/omsupply/ \
  msupplyfoundation/omsupply:v2.7.3-dev \
  -c "rsync -av --exclude='/node_modules' client/ clientdev/"
```

Overriding `--entrypoint` like this lets you drop the trailing CLI args and bash into the image when needed.

Start the front end. The anonymous `-v /usr/src/omsupply/client/node_modules` mount preserves the image's prebuilt `node_modules`, hiding the empty host folder underneath:

```bash
docker run -p 9003:3003 \
  -v "$(pwd)/clientdev":/usr/src/omsupply/client \
  -v /usr/src/omsupply/client/node_modules \
  -ti --entrypoint="/bin/bash" -w /usr/src/omsupply/client \
  msupplyfoundation/omsupply:v2.7.3-dev \
  -c "yarn start --env API_HOST='http://localhost:9000'"
```

Start the server in a second terminal:

```bash
docker run -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

Edit files in `clientdev/client` and the web app should pick them up. Hot reload is not always reliable in this setup — you may need to refresh the page.

### Configuration overrides

All configuration values can be overridden via environment variables using the `APP_` prefix with `__` for nesting. See [example.yaml](../server/configuration/example.yaml) for all available options.

```bash
docker run -p 9000:8000 \
  -e APP_DATABASE__DATABASE_NAME="custom-name" \
  -e APP_DATABASE__HOST="custom-host" \
  msupplyfoundation/omsupply:v2.7.3
```
