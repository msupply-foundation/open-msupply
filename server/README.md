# remote-server

mSupply remote server is a component of the Open mSupply system:

- Hosts the remote server web interface and exposes RESTful and GraphQL APIs for mSupply data.
- Synchronises with central servers which implement `v5` of the mSupply sync API.
- Exposes a dynamic plugin system for customising and extending functionality.

# Quick Start

Remote server can use `sqlite` or `postgres`, quick start guide is for `sqlite` flavour.

## Dependencies

### Windows
- [Follow this guide](https://docs.microsoft.com/en-us/windows/dev-environment/rust/setup)
- Install [perl](https://learn.perl.org/installing/windows.html)

### Mac

- Follow the [Rust installation guide](https://www.rust-lang.org/tools/install).

- For M1 Mac:

`brew install libpq` and add the following to `~/.cargo/config.toml`

```
[env]
MACOSX_DEPLOYMENT_TARGET = "10.7"

[target.aarch64-apple-darwin]
rustflags = "-L /opt/homebrew/opt/libpq/lib"
```

### Ubuntu

- Follow the [Rust installation guide](https://www.rust-lang.org/tools/install).
- Install pkg-config `sudo apt install pkg-config` (needed to install/compile sqlx-cli)

# Run without mSupply central

Remote server data is configured through mSupply central server, when app first start it's expected to initialise from mSupply. There is a cli option to initalise from previously exported initialisation:

```bash
cargo run --bin remote_server_cli -- initialise-from-export -n [export name]
```

Where `[export name]` is name of exported data in `data/` folder

```bash
# example
cargo run --bin remote_server_cli -- initialise-from-export -n reference1
```

Above will create sqlite database in root folder with the name specified in `configuration/*.toml` and will populate it with data. Towards the end of console output of the cli command user:password list is presented (those users can be used to log in vi client/api)

Now we can start server with 

```
cargo run
```

Explore API available on `http://localhost:8000/graphql` with build in playground or try [online graphiql explorer](https://graphiql-online.com/)

# Run with postgres

## Dependencies

When using Postgres, Postgres 12 or higher is required.

### Windows

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

### Mac

- Download and install via [installers](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)

### Ubuntu

- Install Postgres dev libs: `sudo apt install postgresql-server-dev-13`

### Optional

- Install [pgAdmin](https://www.pgadmin.org/download/) (see [deployment instructions](https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html) if using the Docker image)

## Postgres rust feature

Remote server by default will run with sqlite database (`sqlite` rust feature), postgres can be turned on with `postgres` feature. 

i.e. to run withouth mSupply central, as per above

* Make sure that postgres credentials are correct in `configuration/*.yaml` (database will be automatically created)

```bash
cargo run --bin remote_server_cli --features postgres -- initialise-from-export -n reference1
cargo run --features postgres
```

## Database CLI

You can manually create and migrate database with the following

* Settings in `configurations/*.yaml` will be used for credentials and database name

```bash
# postgres
cargo run --bin remote_server_cli --features postgres -- initialise-database
# sqlite
cargo run --bin remote_server_cli -- initialise-database
```

## Configs

`note`: yaml configurations are likely to be deprecated to .env, thus documentations is limited for .yaml.

In `configurations` folder you'll find `.yaml` config files, there is `base`, `local` (will overwrite/expand `base` in dev mode), `producation` (will overwrite/expand other configs when `APP_ENVIRONMENT=production ).

You can use env variable to overwrite any configurations, can use dot notation with `__` (two underscorse) to specify nested value. Env vars configuration overrides start with `APP_`.

```bash
# example, will overwrite sync.url config in yaml
APP_SYNC__URL='http://localhost:8001' cargo run
```

## Export initialisation

If you have mSupply central running and want to export initialisation

* Note sync credentials from `configurations/*.yaml` or env vars will be used

```bash
cargo run --bin remote_server_cli -- export-initialisation -n [name of export] -u [users]
# example
cargo run --bin remote_server_cli -- export-initialisation -n 'reference2' -u 'user1:password1,user2:password2'
# password in configurations/.*yaml is hashed, can use -p option to specify unhashed password
cargo run --bin remote_server_cli -- export-initialisation -n 'reference2' -u 'user1:password1,user2:password2' -p 'syncpassword'
```

## SSL/https

- To enable ssl place the `key.pem` and `cert.pem` files into the `certs` directory.
- Update the server.host variable in the configuration if needed
- In production (-release build) server must be running with ssl

### Use a self signed cert, e.g. for testing

```bash
# Ensure certs directory exits
mkdir -p certs
# Testing cert for CN=localhost
openssl req -x509 -newkey rsa:4096 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj '/CN=localhost'
```

# Test

Devs should run both postgres and sqlite test before publishing PR

- To run all tests:

```bash
# Use sqlite (sqlite is default feature)
cargo test
# Use postgres
cargo test --features postgres
```

## Building docs

Docs are built via github action, but can build local version with docker: [how to build docs locally](docker/zola_docs/README.md)

## CORS settings

By default remote-server limits Cross-Origin Resource Sharing to the origins configured in the server section of the configuration yaml.
This is a security mechanism to reduce the risk of a malicious site accessing an authenticated connection with mSupply.
Rust enforces the allowed origins in requests, even if the browser doesn't, by returning a 400 error when the Origin isn't specified in a request, or if doesn't match one of origins configured in cors_origins.

Set the cors_origins section of the yaml to include any URLs you want to access omSupply's GraphQL API from this includes the url for the omsupply-client you are using.
e.g. local.yaml
```
server:
  port: 8000
  cors_origins: [http://localhost:3003, https://youwebserver:yourport]
````

In development mode (if not built with --release) cors is set to permissive (server will return allow origin = requesting origin)

```
server:
  port: 8000
  cors_origins: [http://localhost:3003, https://youwebserver:yourport]
```

# Serving front end

Server will server front end files from (client/packages/host/dist), if the client was not build and the folder is empty, server will return an error message: Cannot find index.html. See https://github.com/openmsupply/open-msupply#serving-front-end.

You can build front end by running `yarn build` from `client` directory in the root of the project. After that if you run the server you can navigate to `http://localhost:port` to see this feature in action.

When app is built in production mode (with build --release) static files will be embeded in the binary. There is `yarn build` command at the root of repository.

TODO build instructions

# Cli

Some common operations are availalbe via cli `remote_server_cli`, the `--help` flag should give a detailed explanation of how to use `cli`. Here are example of all of the currently available commands. `note:` configurations from `configurations/*.yaml` or env vars will be used when running cli commands.

`note:` All of the cli commands are meant for development purposes, some commands are dangerous to run in production

```bash
# overall help
cargo run --bin remote_server_cli -- --help
# help for an action
cargo run --bin remote_server_cli -- initialise-from-export --help
# exports graphql schema to schema.graphql file
cargo run --bin remote_server_cli -- export-graphql-schema
# initialise database (creates or replaces existing database and initialises schema)
cargo run --bin remote_server_cli -- initialise-database
# by default all commands will run with sqlite database, use --features postgres to use postgres database (not applicable to export-initialisation or export-graphql-schema action)
cargo run --bin remote_server_cli --features postgres -- initialise-database
# export initialisation data from mSupply central to `data/export_name` folder
cargo run --bin remote_server_cli -- export-initialisation -n 'export_name' -u 'user1:password1,user2:password2' -p 'sync_password'
# initialise database from initialisation export (will replace current data), and in this case -r flag will attempt to advance all historic date and date/times forward.
cargo run --bin remote_server_cli -- initialise-from-export -n 'export_name' -r
# initialise from mSupply central (will replace current data)
cargo run --bin remote_server_cli -- initialise-from-central -u 'user1:password1'
# attempt to refresh dates (advance them forward, see --help)
cargo run --bin remote_server_cli -- refresh-dates
```
