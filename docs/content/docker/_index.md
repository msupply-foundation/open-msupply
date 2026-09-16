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

The `docker-release.yaml` workflow fires automatically when a tag starting with `v` is pushed:

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

The build itself is defined once, in `docker-image.yaml`, which has no triggers of its own — it is called by `docker-release.yaml` (tags) and `docker-cd.yaml` (continuous deployment). Each caller passes a matrix, a version, and whether it wants floating aliases and dev images; the shared build has no idea which one called it.

1. **Classify** (`docker-release.yaml`) — decides from the tag whether it is a release or a nightly, and produces the variant matrix and floating alias prefix. The CD workflow has an equivalent `plan` job that just names the commit.
2. **Image** (1, 2 or 4 parallel jobs) — one `docker buildx build` per (db, arch). Everything is compiled inside the Dockerfile: the server, the old UI, and the new frontend. Release tags additionally build the `-dev` images.
   - **amd64** builds run natively on the runner
   - **arm64** builds cross-compile — the Dockerfile pins its compile stages to `$BUILDPLATFORM`, so `rustc` never runs emulated (release tags only)
3. **Deploy** (`docker-cd.yaml`) — brings the develop environment up on the new image. Never runs for tags.
4. **Trigger plugin tests** (`docker-release.yaml`) — runs the downstream plugin test suite against the new dev images (release tags only)

Both callers share the build cache. BuildKit keys on the build's content, not on the workflow that invoked it, so a develop merge warms what the nightly tag needs.

There is no separate client or server build job and no artifact hand-off between jobs. That shape suited GitHub-hosted runners, where each job gets a fresh VM; on a self-hosted box the jobs serialise on a lane and the artifacts move ~100MB between two steps on the same disk. BuildKit runs the frontend build concurrently with the server compile inside one job instead. Use `--progress plain` (already set) rather than splitting it back out for per-step visibility.

Everything publishes to `msupplyfoundation/omsupply`. Continuous-deployment builds (`docker-cd.yaml`) are tagged `develop-<sha>-<db>-amd64` and get **no** floating tag: `latest-develop*` is the nightly pointer that demo servers follow, and repointing it on every merge would push unvetted commits at them several times a day. CD tags are immutable and the nightly cleanup sweeps them after 30 days like any other non-release tag.

### Image tags

Images are pushed to `msupplyfoundation/omsupply` with the naming convention:

| Tag                          | Example                     | When built / repointed             |
| ---------------------------- | --------------------------- | ---------------------------------- |
| `v{version}-{db}-{arch}`     | `v2.8.0-sqlite-amd64`       | All tags                           |
| `v{version}-{db}-{arch}-dev` | `v2.8.0-sqlite-amd64-dev`   | Release tags only                  |
| `latest[-{db}]`              | `latest`, `latest-postgres` | Repointed on every release tag     |
| `latest-develop[-{db}]`      | `latest-develop`            | Repointed on every develop nightly |
| `latest-rc[-{db}]`           | `latest-rc-postgres`        | Repointed on every RC nightly      |

Dev images (which include Node/Yarn and the client source for frontend development) are only built for amd64 on release tags.

The `latest*` floating tags always point at **amd64** images, and the bare tags (`latest`, `latest-develop`, `latest-rc`) are the **sqlite** flavour. If more than one RC branch (or more than one develop-family branch) receives commits on the same day, the nightly build tags each of them and the shared floating tag ends up on whichever build pushed last.

### Auto-updating demo/test servers (Watchtower)

The floating tags make it easy to run a demo or test server that always tracks the latest develop build. Example `docker-compose.yml` using [Watchtower](https://watchtower.nickfedor.com/) to poll Docker Hub and restart the container when `latest-develop` moves:

```yaml
services:
  omsupply:
    image: msupplyfoundation/omsupply:latest-develop
    restart: unless-stopped
    ports:
      - "9000:8000"
    volumes:
      # Directory mount; the SQLite file inside must be named
      # omsupply-database.sqlite (see "Running the images" below)
      - ./database:/database

  watchtower:
    # Maintained fork. The original containrrr/watchtower is unmaintained
    # and will not start on a modern Docker Engine — see note below.
    image: nickfedor/watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_CLEANUP=true # delete superseded images after updating
      - WATCHTOWER_POLL_INTERVAL=3600 # check for a new image every hour (seconds)
```

<div class="alert alert-warning">
<strong>Do not use <code>containrrr/watchtower</code>.</strong> It has had no release since v1.7.1 (2023) and its bundled Docker client requests API version 1.25, which current Docker Engines reject. The container crash-loops with <code>Error response from daemon: client version 1.25 is too old. Minimum supported API version is 1.40</code> (or 1.44). The fix is the actively maintained fork <code>nickfedor/watchtower</code>, which negotiates the API version and keeps the same <code>WATCHTOWER_*</code> settings. As a stopgap on an existing deployment you can instead add <code>DOCKER_API_VERSION=1.40</code> to the old image's <code>environment:</code>, but that only works while the engine's minimum stays at or below what its vendored client supports.
</div>

Floating tags are amd64-only. Nightly develop builds may include schema migrations that cannot be rolled back — treat the `/database` volume as disposable on servers tracking `latest-develop`.

### Docker Hub cleanup

A separate `cleanup-docker-tags.yaml` workflow runs nightly to remove old non-release images from Docker Hub. Release images and the floating `latest*` tags are always kept. Non-release images older than 30 days (configurable) are deleted.

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
- The tmf-ci-bot GitHub App credentials (`TMF_CI_BOT_APP_ID` variable and `TMF_CI_BOT_PRIVATE_KEY` secret) are needed for triggering downstream plugin tests

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

## Building an image

Everything - the server, the legacy client, and the new frontend - is compiled
inside the Dockerfile. One command produces a complete image:

```bash
docker buildx build --target postgres -t msupplyfoundation/omsupply:dev .
```

There is no separate compile step and nothing to stage beforehand. The previous
process (build the client, build the frontend into `frontend-dist/`, compile the
server with `docker run ... cargo build`, then `docker build` to assemble) has
been folded into the Dockerfile's stage graph, which is drawn at the top of that
file.

Interactively, with prompts for architecture, database, cargo profile and pushing:

```bash
yarn dockerise
```

### Targets

| `--target`     | contents |
| -------------- | -------- |
| `sqlite`       | SQLite server. The default if `--target` is omitted |
| `postgres`     | Postgres server, with a Postgres instance bundled in the image |
| `dev`          | `sqlite` plus Node, Yarn and the client source |
| `postgres-dev` | `postgres` plus the same |

BuildKit only runs the stages a target needs, so `--target sqlite` never
compiles the Postgres binaries.

### Debug builds

The server compile defaults to cargo's `release` profile. `CARGO_PROFILE=debug`
swaps it for the `dev` profile:

```bash
docker buildx build --build-arg CARGO_PROFILE=debug --target postgres -t <tag> .
```

What changes, mechanically: the optimisation pass is skipped, so the compile is faster and the binary slower; the output is not stripped, where release sets `strip = true` in `server/Cargo.toml`; and debug assertions and integer-overflow checks are on. That last one is arguably a feature for a throwaway build - an overflow that would silently wrap in production panics instead.

**Nothing in CI builds `debug`.** Release tags, nightlies and CD to `develop` all build `release`, and the `profile` input on `docker-image.yaml` exists so a future caller can choose otherwise. For now debug is reached by building locally, or by picking it at `dockerise.sh`'s prompt. Never benchmark a debug image or quote its size.

#### What the deltas actually are

Not yet measured. The job summary of each image build records the profile, image
size and build time, so the numbers accumulate as builds run; for both halves on
one commit, build it each way and compare the two summaries.

The one thing worth knowing before reading those numbers is the baseline. A
*stripped release* `remote_server` is already large, because `rust-embed` bakes
both frontends, the locales and the standard reports and forms into it:

| image                                       | `remote_server` | `remote_server_cli` |
| ------------------------------------------- | --------------- | ------------------- |
| `latest-develop-postgres` (amd64)           | 386 MB          | 110 MB              |
| `3.01.01-2026-09-02-sqlite-arm64`           | 316 MB          | 86 MB               |

So roughly 300MB of that is embedded assets, which is the same in either
profile. Debug adds unoptimised code and DWARF on top of that floor rather than
multiplying it, so expect the *ratio* to be less alarming than the raw delta.
If size turns out to be the binding constraint rather than build time,
`debug = "line-tables-only"` on `[profile.dev]` keeps usable backtraces for a
fraction of the debug info.

### Other architectures

```bash
docker buildx build --platform linux/arm64 --target postgres -t <tag> .
```

The compile stages are pinned to the *build* platform and cross-compile to the
target, so `rustc` runs natively rather than under emulation. Do **not** add
QEMU to work around this - it is what the pinning exists to avoid, and it makes
the build several times slower.

### Rebuilds

The cargo target directory and the package caches are BuildKit cache mounts, so
an unchanged rebuild costs seconds and a changed one recompiles only what the
change reaches. To force a genuinely cold build:

```bash
docker builder prune --filter type=exec.cachemount
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
