+++
title = "Open omSupply Docker"
weight = 40
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Open omSupply Docker

Dockerise github action is made to fire when a new tag is created, this tag needs to start with `v`, this action uses Dockerfile in root dir.

Dockerfile has two pre-requisites:

`remote_server` and `remote_server_cli` built in release mode (after building client).

If building on a non-Linux host (e.g. macOS), use a Docker container to cross-compile a Linux binary. The `-v` flag mounts your source code into the container and the compiled binary is written back to your host filesystem.

If building natively on Linux, you can use `cargo build` directly.

### SQLite (default)

Via Docker (for macOS or other non-Linux hosts):

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

`async-dataloader.patch` is required because of 'blocking' [requests issue](https://github.com/async-graphql/async-graphql/issues/1716) in async graphql loaders.

`entry.sh` calls cli before starting server or allows use of cli as an argument.

`entry-postgres.sh` starts an embedded PostgreSQL instance, optionally imports a dump file, then hands off to `entry.sh`.

Docker hub credentials need to be setup as secrets for `DOCKER_USERNAME' and `DOCKER_TOKEN` (from docker hub)

## Docker targets

| Target         | Database | Description                                                            |
| -------------- | -------- | ---------------------------------------------------------------------- |
| `sqlite`       | SQLite   | Default runtime image                                                  |
| `dev`          | SQLite   | Includes client with Node/Yarn for frontend development                |
| `postgres`     | Postgres | Runtime image with embedded PostgreSQL server                          |
| `postgres-dev` | Postgres | Embedded PostgreSQL with client and Node/Yarn for frontend development |

## Build steps (as per dockerise.yaml github action workflow)

* Build client
* Build server in rust:1.94-slim image container (uses built client)
* Build client in rust:1.94-slim image container with yarn pre installed
* Build docker image
   * copy binaries
   * set hardware id
   * copy entrypoint
   * in dev target add dependencies for yarn
   * copy client and run yarn install
* Tag docker images and push to dockerhub

## Building image locally

This is needed when building apple m chip version on your m chip mac.

### SQLite

```bash
# Build client
cd client && yarn && yarn build
# Build server
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

```bash
# Build client
cd client && yarn && yarn build
# Build server with postgres feature
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