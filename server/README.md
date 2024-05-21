# Server

Open mSupply server is a component of the Open mSupply system. The server:

- Hosts the server web interface and exposes RESTful and GraphQL APIs for open mSupply data.
- Synchronises with central servers which implement `v5` of the mSupply sync API.
- Exposes a dynamic plugin system for customising and extending functionality.
- Can act as a remote or central omSupply server, see [Synchronisation documentation](https://github.com/msupply-foundation/open-msupply/blob/develop/server/service/src/sync/README.md#glossary)

# Quick Start

Remote server can use `sqlite` or `postgres`, quick start guide is for `sqlite` flavour.

## Dependencies

### Windows

- [Follow this guide](https://docs.microsoft.com/en-us/windows/dev-environment/rust/setup)
- Install [perl](https://learn.perl.org/installing/windows.html)
- For building the windows binary, you'll need to install the [Bonjour Windows SDK](https://developer.apple.com/bonjour/) and configure the environment variable `BONJOUR_SDK_HOME` to point to the installation location. This is required for the dns-sd implementation on windows, used for server discovery.

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

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

- After a fresh `rustup` installation start a new bash to make env variable available
- Install packages (e.g. needed to install/compile openssl-sys):

```bash
sudo apt install make gcc pkg-config libavahi-compat-libdnssd-dev libpq-dev
```

# Set up sync with mSupply central

Remote server data is configured through mSupply central server, when the app first starts it's expected to initialise from mSupply.

### Set up Open mSupply remote site in mSupply

- Ensure you have mSupply set up locally
- In Admin > Preferences > General, ensure `Synchronisation is active` is selected
- In Special > Synchronisation
  - Open (or create) the site for our Open mSupply instance
  - Does it have a hardware ID already? If so, refresh the hardware ID so it doesn't have one.
- Initialise your Open mSupply instance - you can do this two ways:
  - Via the UI (this may be the easier option when you are switching between different APIs):
    - After starting the server & client, you should see an initialisation screen
    - Enter the site details from mSupply
  - Via YAML configuration:
    - In your Open mSupply repo, under `server/configuration` copy the `example.yaml` to `local.yaml`, and uncomment the contents of the file. Under the `sync` config, ensure the `username` is set to the site name from mSupply (i.e. `remote`)
    - Your Open mSupply instance should sync with mSupply automatically when you start the server
- After the initial sync, you generally shouldn't need mSupply running to run Open mSupply

### OR: Run without mSupply central

Instead of initialising from mSupply, there is also a cli option to initialise from previously exported initialisation:

```bash
cargo run --bin remote_server_cli -- initialise-from-export -n [export name]
```

Where `[export name]` is name of exported data in `data/` folder

```bash
# example
cargo run --bin remote_server_cli -- initialise-from-export -n reference1
```

Above will create sqlite database in root folder with the name specified in `configuration/*.yaml` and will populate it with data. Towards the end of console output of the cli command user:password list is presented (those users can be used to log in vi client/api)

## Start the server

Now we can start server with

```
cargo run
```

> NOTE: make sure that sync configurations in `configuration/*.yaml` files are commented out if running without mSupply Central, otherwise you may get an error stating that the database and yaml sync configurations differ (in which case, the remote server will try to contact central server)

Explore API available on `http://localhost:8000/graphql` with build in playground or try [online graphiql explorer](https://graphiql-online.com/)

## Open mSupply Central and Remote

Open mSupply server can be launched in both modes, this is controlled via `Site is open mSupply central server` configuration in legacy mSupply site settings, more info in [Sync Docs](https://github.com/msupply-foundation/open-msupply/blob/develop/server/service/src/sync/README.md#open-msupply-central-server) and [Integration Test Docs](https://github.com/msupply-foundation/open-msupply/blob/develop/server/service/src/sync/test/integration/README.md#4-open-msupply-central-server).

From version 2.0 omSupply would require both legacy and omSupply central server for full configuration/synchronisation. To start both omSupply central and omSupply remote:

- Create two sites as per [above "Set up sync with mSupply central" instructions](https://github.com/msupply-foundation/open-msupply/blob/develop/server/service/src/sync/test/integration/README.md#4-open-msupply-central-server)
- Configure one site to be central server by checking `Site is open mSupply central server` and entering the URL with which remote sites can reach this site in the field `This site url`
- `cargo run` twice but change port, database and sync settings in yaml file or overwrite with env variables

For example, two sites running locally from the same repo,  __central__ and  __test__, for __central__ site `Site is open mSupply central server` is checked and `This site url` is http://localhost:2055. 
Comment out all sync settings in yaml and can start  __central__ with `APP_SERVER__PORT=2055 APP_DATABASE__DATABASE_NAME="central_test" cargo run` front end would be started with `yarn start -- -- --env API_HOST='http://localhost:2055' --port 3005` (--port is for webpack port), and then start  __test__ with `cargo run` and `yarn && yarn start-local` from respective folders. The first site would be initialised with `central` site credentials first, and second sites with  __test__ credentials,  __test__ site would sync with both legacy mSupply and omSupply central server (this  __central__ site), and __central__ site would synchronise with legacy mSupply server only


### Start server in watch mode

Sometimes it's nice to have your dev server automatically rebuild and restart on changes.

You'll need to install `cargo-make` and `cargo-watch` globally:

```
cargo install cargo-make cargo-watch
```

Then, to start the server in watch mode:

```
cargo make watch
```

> Note: watch mode may not always be a part of your desired workflow - particularly when you are making lots of backend changes, it's another competitor for the build directory file lock on every save (alongside tests, rust-analyzer...) and Rust compilation isn't known for its speediness 😁
>
> It's great for cases such as doing frontend work, where you want the backend to refresh as you switch/pull branches, or when making minor backend changes. Or you can play around with debounced re-compile times, with the `cargo-watch` `--delay` flag.

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
# CAUTION: this is irreversible!
Set-ItemProperty -Path 'Registry::HKEY_LOCAL_MACHINE\System\CurrentControlSet\Control\Session Manager\Environment' -Name PATH -Value $env:Path
Set-ItemProperty -Path 'Registry::HKEY_LOCAL_MACHINE\System\CurrentControlSet\Control\Session Manager\Environment' -Name PQ_LIB_DIR -Value $env:PQ_LIB_DIR
```

### Mac

- Download and install via [installers](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)

### Ubuntu

- Install Postgres:

```bash
sudo apt install postgresql
```

### Optional

- Install [pgAdmin](https://www.pgadmin.org/download/) (see [deployment instructions](https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html) if using the Docker image)

## Postgres rust feature

Remote server by default will run with sqlite database (`sqlite` rust feature), postgres can be turned on with `postgres` feature.

i.e. to run without mSupply central, as per above

- Make sure that postgres credentials are correct in `configuration/*.yaml` (database will be automatically created)

```bash
cargo run --bin remote_server_cli --features postgres -- initialise-from-export -n reference1
cargo run --features postgres
```

## Database CLI

You can manually create and migrate database with the following

- Settings in `configurations/*.yaml` will be used for credentials and database name

```bash
# postgres
cargo run --bin remote_server_cli --features postgres -- initialise-database
# sqlite
cargo run --bin remote_server_cli -- initialise-database
```

## Sharing SQLite Database files

When using sqlite, open-mSupply enables a feature called [Write Ahead Log (WAL)](https://sqlite.org/wal.html), this uses a separate file to improve concurrent access to the data.
If you want to ensure all your changes have been written to the main sqlite database file, you may need to run the `VACUUM` command against your database.

`sqlite3 omsupply-database 'VACUUM;'`

## Configs

`note`: yaml configurations are likely to be deprecated to .env, thus documentations is limited for .yaml.

In `configurations` folder you'll find `.yaml` config files, there is `base`, `local` (will overwrite/expand `base` in dev mode), `production` (will overwrite/expand other configs when `APP_ENVIRONMENT=production ).

You can use env variable to overwrite any configurations, can use dot notation with `__` (two underscore) to specify nested value. Env vars configuration overrides start with `APP_`.

```bash
# example, will overwrite sync.url config in yaml
APP_SYNC__URL='http://localhost:8001' cargo run
```

## Export initialisation

If you have mSupply central running and want to export initialisation

- Note sync credentials from `configurations/*.yaml` or env vars will be used

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

- To run sync integration test

See [Sync Integration Tests](service/src/sync/test/integration/README.md)

Note, to speed-up tests database templates are used (Sqlite + Postrgres), e.g. to reuse fully migrated databases from previous tests.
To disable this you can set the environment variable `MSUPPLY_NO_TEST_DB_TEMPLATE=true`.
However, in general this should not be needed but might be useful if you suspect a bug in the test template code.

## Building docs

Docs are built via github action, but can build local version with docker: [how to build docs locally](docker/zola_docs/README.md)

## CORS settings

By default remote-server limits Cross-Origin Resource Sharing to the origins configured in the server section of the configuration yaml.
This is a security mechanism to reduce the risk of a malicious site accessing an authenticated connection with mSupply.
Rust enforces the allowed origins in requests, even if the browser doesn't, by returning a 400 error when the Origin isn't specified in a request, or if doesn't match one of origins configured in cors_origins.

Set the cors_origins section of the yaml to include any URLs you want to access Open mSupply's GraphQL API from this includes the url for the omsupply-client you are using.
e.g. local.yaml

```
server:
  port: 8000
  cors_origins: [http://localhost:3003, https://youwebserver:yourport]
```

In development mode (if not built with --release) cors is set to permissive (server will return allow origin = requesting origin)

```
server:
  port: 8000
  cors_origins: [http://localhost:3003, https://youwebserver:yourport]
```

# Serving front end

Server will serve front end files from (client/packages/host/dist), if the client was not build and the folder is empty, server will return an error message: Cannot find index.html. See https://github.com/openmsupply/open-msupply#serving-front-end.

You can build front end by running `yarn build` from `client` directory in the root of the project. After that if you run the server you can navigate to `http://localhost:port` to see this feature in action.

When app is built in production mode (with build --release) static files will be embedded in the binary. To build, run `yarn build` command from the root of repository. This will build the client application and then build the release version of the server, bundling in the client so that it can be hosted.

# Cli

Some common operations are available via cli `remote_server_cli`, the `--help` flag should give a detailed explanation of how to use `cli`. Here are example of all of the currently available commands. `note:` configurations from `configurations/*.yaml` or env vars will be used when running cli commands.

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
# export initialisation data from mSupply central to `data/export_name` folder (IMPORTANT: Should not be used on large data files, as single JSON format is not suited for large set of data)
cargo run --bin remote_server_cli -- export-initialisation -n 'export_name' -u 'user1:password1,user2:password2' -p 'sync_password'
# initialise database from initialisation export (will replace current data), and in this case -r flag will attempt to advance all historic date and date/times forward.
cargo run --bin remote_server_cli -- initialise-from-export -n 'export_name' -r
# initialise from mSupply central (will replace current data)
cargo run --bin remote_server_cli -- initialise-from-central -u 'user1:password1'
# attempt to refresh dates (advance them forward, see --help)
cargo run --bin remote_server_cli -- refresh-dates
```

# Discovery

DNS-SD is available for all targets except for Android (for Android DNS-SD is toggled at runtime and is done in native java code).
We also start another graphql server with `initialisationStatus` query endpoint, in http mode with permissive cors.
This allows site information (initialised/site) to be presented during discovery.

# Logging

By default, the server logs to console with a logging level of `Info`
You can configure this, to log to a file, for example, with a rollover of log files based on file size.
See the `example.yaml` file for the available options.

# Directory structure

An overview of how files are organised in the server repo is shown below, with annotations as noted.
The files have been split in this way, grouped in crates, partly to improve build times - as well as a logical organisation of grouped concerns.

```
server
├─ android (hoisting for the android implementation)
├─ cli
├─ configuration (runtime configuration files)
├─ data (contains reference data which can be used by the cli to initialise the database)
├─ docs
├─ graphql
│  ├─ batch_mutations (batch mutations are grouped here)
│  ├─ core (the loaders, filters, errors, pagination and test helpers)
│  ├─ general (mutations and queries which are shared or small enough to not require separate implementation)
│  ├─ types (each database table has its types defined in a file)
│  ├─ [data type]
│  │  ├─ src
│  │  │  ├─ lib.rs (queries are in here, if not in a separate file, as below)
│  │  │  ├─ [data type]_queries.rs
│  │  │  └─ mutations
│  │  └─ test_output
├─ report_builder
├─ repository
│  ├─ migrations
│  ├─ src
│  │  ├─ db_diesel (definitions for the database objects)
│  │  └─ mock
│  └─ test_output
├─ scripts
├─ server (includes the logging, front-end hosting, certificates, DNS-SD discovery, configuration)
├─ service (these functions provide an intermediary between GraphQL and the repository and houses most of the business logic)
├─ target
├─ test_output
├─ util
└─ windows (windows service hosting for the server)
```

The `batch_mutations` case is a special one - the crate is fairly slow to compile, so has been split out. There are also some dependency issues, as it combines other objects, such as `invoice` and `invoice_line`.
