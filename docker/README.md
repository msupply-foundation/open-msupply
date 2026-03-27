# Open omSupply Docker

Dockerise github action is made to fire when a new tag is created, this tag needs to start with `v`, this action uses Dockerfile in root dir.

Dockerfile has two pre-requisites:

`remote_server` and `remote_server_cli` built in release mode, they should be built inside the rust:1.94-slim docker image (after building client).

For SQLite (default):

```bash
docker run --rm --user "$(id -u)":"$(id -g)" -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/server rust:1.94-slim cargo build --release --bin remote_server --bin remote_server_cli
```

For Postgres:

```bash
docker run --rm --user "$(id -u)":"$(id -g)" -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/server rust:1.94 cargo build --release --bin remote_server --bin remote_server_cli --no-default-features --features postgres
```

**Important:** The rust image version used for compilation must match the version in the Dockerfile to avoid glibc version mismatches. The postgres build uses `rust:1.94` (non-slim) because it needs `libpq-dev` which is not included in the slim variant.

[docker-hub.md](./docker-hub.md) explains the feature set of the docker image.

`async-dataloader.patch` is required because of 'blocking' [requests issue](https://github.com/async-graphql/async-graphql/issues/1716) in async graphql loaders.

`entry.sh` calls cli before starting server or allows use of cli as an argument.

`entry-postgres.sh` starts an embedded PostgreSQL instance, optionally imports a dump file, then hands off to `entry.sh`.

Docker hub credentials need to be setup as secrets for `DOCKER_USERNAME' and `DOCKER_TOKEN` (from docker hub)

## Docker targets

| Target | Database | Description |
|--------|----------|-------------|
| `base` | SQLite | Default runtime image |
| `dev` | SQLite | Includes client with Node/Yarn for frontend development |
| `postgres` | Postgres | Runtime image with embedded PostgreSQL server |
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
docker build . -t msupplyfoundation/omsupply:v2.7.3-arm64 --target base && \
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
cd ../ && docker run --rm --user "$(id -u)":"$(id -g)" -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/server rust:1.94 cargo build --release --bin remote_server --bin remote_server_cli --no-default-features --features postgres
# Dockerise with tag
docker build . -t msupplyfoundation/omsupply:v2.7.3-arm64-postgres --target postgres && \
docker build . -t msupplyfoundation/omsupply:v2.7.3-arm64-postgres-dev --target postgres-dev
# "docker hub" in bitwarden
docker login
docker push msupplyfoundation/omsupply:v2.7.3-arm64-postgres && \
docker push msupplyfoundation/omsupply:v2.7.3-arm64-postgres-dev
```

The postgres image runs its own PostgreSQL server inside the container. To import an existing database dump on launch, mount the dump file to `/database/import.dump`:

```bash
docker run -v "$(pwd)/my_dump.dump":/database/import.dump -p 9000:8000 \
  msupplyfoundation/omsupply:v2.7.3-arm64-postgres
```

The database name can be overridden via environment variable:

```bash
docker run -v "$(pwd)/my_dump.dump":/database/import.dump -p 9000:8000 \
  -e APP_DATABASE__DATABASE_NAME="my-database" \
  msupplyfoundation/omsupply:v2.7.3-arm64-postgres
```