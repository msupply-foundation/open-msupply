# remote-server

mSupply remote server is a component of the Open mSupply system:

- Hosts the remote server web interface and exposes RESTful and GraphQL APIs for mSupply data.
- Synchronises with central servers which implement `v5` of the mSupply sync API.
- Exposes a dynamic plugin system for customising and extending functionality.

## Dependencies

### Windows

- Install [rustup.exe](https://www.rust-lang.org/tools/install), following the instructions for installing Visual Studio C++ Build Tools if prompted.
- Install [PostgreSQL](enterprisedb.com/downloads/postgres-postgresql-downloads).
- Locate your `PostgresSQL` installation directory (e.g. `C:\Program Files\PostgreSQL\14\`).
- Update `Path` and `PQ_LIB_DIR` environment variables:

```
> $env:PQ_LIB_DIR='C:\Program Files\PostgreSQL\14\lib'
> $env:Path+='C:\Program Files\PostgreSQL\14\lib;C:\Program Files\PostgreSQL\14\bin'
```

- To persist `Path` and `PQ_LIB_DIR` for all future sessions, paste the following into a powershell terminal (requires administrator privileges):

```
# CAUTION: this is irreversable!
Set-ItemProperty -Path 'Registry::HKEY_LOCAL_MACHINE\System\CurrentControlSet\Control\Session Manager\Environment' -Name PATH -Value $env:Path
Set-ItemProperty -Path 'Registry::HKEY_LOCAL_MACHINE\System\CurrentControlSet\Control\Session Manager\Environment' -Name PQ_LIB_DIR -Value $env:PQ_LIB_DIR
```

### Windows Subsystem for Linux (WSL)

- Install [WSL2](https://docs.microsoft.com/en-us/windows/wsl/install-win10) and [Ubuntu 20.04 LTS](https://www.microsoft.com/en-nz/p/ubuntu-2004-lts/9n6svws3rx71).
- Follow the [Rust installation guide](https://www.rust-lang.org/tools/install) for `Windows Subsystem for Linux` users.
- Follow the [Docker Desktop installation guide](https://docs.docker.com/docker-for-windows/wsl) for WLS2.

### MacOS

- Follow the [Rust installation guide](https://www.rust-lang.org/tools/install).
- Follow the [Docker Desktop installation guide](https://docs.docker.com/docker-for-mac/install/) for Mac.

### Ubuntu

- Follow the [Rust installation guide](https://www.rust-lang.org/tools/install).
- Follow the [Docker Desktop installation guide](https://docs.docker.com/engine/install/) for Linux.
- Install pkg-config `sudo apt install pkg-config` (needed to install/compile sqlx-cli)
- Install Postgres dev libs: `sudo apt install postgresql-server-dev-13`

### Optional

- Install [pgAdmin](https://www.pgadmin.org/download/) (see [deployment instructions](https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html) if using the Docker image).

## Getting started

- Install [diesel_cli](https://crates.io/crates/diesel_cli):

```bash
cargo install diesel_cli --no-default-features --features "sqlite-bundled postgres"
```

- Pull the latest [Postgres]() image and initialise the Docker container:

```bash
./scripts/init_db.sh
```

- Migrate database tables:

```bash
# postgres
diesel migration run --database-url='postgres://postgres:password@localhost:5432/omsupply-database' --migration-dir ./repository/migrations/postgres

# sqlite
diesel migration run --database-url ./omsupply-database.sqlite --migration-dir ./repository/migrations/sqlite/
```

- Build and start the remote server:

```bash
APP_ENVIRONMENT=local cargo run # optionally specify APP_ENVIRONMENT=production, defaults to local if not specified
```

## Tests

`important` graphql test require latest export of graphql schema, need to run `cargo run --bin export_graphql --features sqlite` when making changes to graphql schema (changes that may affect tests). Make sure to `commit` schema.graphql for CI tests to work.

- To run all tests:

```bash
# postgres
cargo test --features postgres

# sqlite
cargo test --features sqlite
```

## Building docs

Docs are built via github action, but can build local version with docker: [how to build docs locally](docker/zola_docs/README.md)
