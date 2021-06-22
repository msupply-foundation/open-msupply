# omsupply-remote

## Dependencies

- [rustup](https://rustup.rs).
- [docker](https://docs.docker.com/get-docker/).

## Getting started

- Initialise Postgres container: `scripts/init_db.sh`.
- Migrate tables: `sqlx migrate run`.
- Build dependencies and server: `cargo build`.
- Start omsupply remote server: `cargo run`.