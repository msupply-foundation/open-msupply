# omsupply-remote

## Dependencies (Mac)

- [Rust](https://rustup.rs).
- [Docker](https://docs.docker.com/get-docker/).

## Dependencies (Windows 10)

- [Docker](https://docs.docker.com/get-docker/).
- [WSL2](https://docs.docker.com/docker-for-windows/wsl/).
- [Ubuntu](https://docs.microsoft.com/en-us/windows/wsl/install-win10).
- [VS Code](https://code.visualstudio.com/docs/remote/wsl-tutorial).

## Extra dependencies for WSL2/Ubuntu

- [Rust] `sudo curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`.

- [psql] `sudo apt install postgres -y`.
- [cc] `sudo apt install build-essential -y`.
- `sudo apt install libpq-dev -y`.
- `sudo apt install pkg-config -y`.
- `sudo apt install libssl-dev -y`.

## Getting started

- Build sqlx: `cargo install sqlx-cli --no-default-features --features postgres`.
- Initialise Postgres container: `scripts/init_db.sh`.
- Migrate tables: `export DATABASE_URL=postgres://postgres:password@localhost:5432/omsupply-database sqlx migrate run`.
- Build dependencies and server: `cargo build`.
- Start omsupply remote server: `cargo run`.

## Setup pgAdmin (for Postgres)

- Install docker image: `docker pull dpage/pgadmin4`.
- Run pgAdmin container: `docker run -p 80:80 -e 'PGADMIN_DEFAULT_EMAIL=user@domain.com' -e 'PGADMIN_DEFAULT_PASSWORD=SuperSecret' -d dpage/pgadmin4`.
- Add new connection: use "proper" local IP address, not 127.0.0.1.
