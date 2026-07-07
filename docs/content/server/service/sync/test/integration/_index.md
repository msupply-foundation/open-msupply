+++
title = "Sync Integration Tests"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Sync Integration Tests

# How to run

1. Requires 'integration_test' feature
2. Requires env vars to be present (for central server credentials)
3. Running original central server
4. Running omSupply central server
5. Run tests

## 1 `integration_test` feature

Either with cli or rust analyzer settings:

- in vscode, `cmd+,`
- top right `Open Settings (JSON)`
- add `"rust-analyzer.cargo.features": ["integration_test"]` (might need to restart vscode)

## 2 `env vars` for sync credentials

The following environment variables should be provided for sync integration test:

- SYNC_SITE_PASSWORD
- SYNC_SITE_NAME
- SYNC_URL

As `1`, can provide via cli or rust analyzer:
`"rust-analyzer.runnables.extraEnv": { "SYNC_URL": "http://localhost:2048", "SYNC_SITE_NAME": "demo","SYNC_SITE_PASSWORD": "pass" }`

## 3 `original central server`

Only data that needs to be present on central server site is a new sync site (though an existing central server datafile is probably fine):

- Create a new data file
- Change user permissions to allow `Add/edit sync sites`
- In preferences
  - Register
  - Turn on both checkboxes in Synchronisation (under General)
  - Under server check `Start web server ..`, change port from 0 and `Start Web Server`
- In Synchronisation window add site and add store to that site
- Reset the hardware id for the used site (SYNC_SITE_NAME): `special` -> `Synchronisation` -> reset id for the site

`IMPORTANT` make sure to run `syncV5API_test_enable` method (and if you restart the data file have to re-run this method)

## 4 `Open mSupply central server`

- Another instance of omSupply should be running as central server, in order to set omSupply instance as central server, you will need to check "Site is open mSupply central server" against the site and enter correct This site url again the site in mSupply->Special->Synchronisation->{Site}
- And graphql API should be 'open' (without token), thus 'APP\_\_SERVER\_\_DEBUG_NO_ACCESS_CONTROL' env variable should be set to `true`

In case you are wondering, the APP env variables translate to settings in [configuration .yaml](https://github.com/msupply-foundation/open-msupply/blob/1b8b9237863eef1a764be3973d563e6d84358827/server/configuration/example.yaml#L7) files, and override them

Here is the full command line I used, for this setting "test" site `Site is open mSupply central server` is ticked and `This site url` is set to "http://localhost:2055"

```bash
APP__SERVER__PORT=2055 APP__DATABASE__DATABASE_NAME="central_test" APP__SYNC__URL="http://localhost:2048" APP__SYNC__INTERVAL_SECONDS=30 APP__SERVER__DEBUG_NO_ACCESS_CONTROL=TRUE APP__SYNC__PASSWORD_SHA256="d74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000feb82e8f1" APP__SYNC__USERNAME="test" cargo run
```

In this case d74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000feb82e8f1 = pass

## 5 `toxiproxy` (only for file-sync pause tests)

The tests in `file_sync_pause.rs` exercise tus chunked upload behaviour under
bandwidth contention with the `FileSyncDriver` and `SynchroniserDriver`
running in the test process — the same wiring as production (see
`server/server/src/lib.rs:144`). The shared scaffolding lives in
`driver_harness.rs` (`RemoteDrivers`, `UploadTrace`).

Four tests:

1. **`integration_file_sync_baseline_no_contention`** — driver picks up a
   queued file and completes the throttled upload when no sync trigger fires.
2. **`integration_file_sync_pause_mid_upload_via_real_sync`** — fires a real
   `sync_trigger.trigger(None)` mid-upload; asserts the file reaches `Done`
   and a chunk-aligned partial `uploaded_bytes` was observed (proving the
   chunk loop returned `Paused` and the offset persisted at a chunk boundary).
3. **`integration_file_sync_unpause_wakeup_latency`** — measures time from
   `unpause()` to first observable driver activity (only `FileSyncDriver`
   spawned, so the measurement isn't blurred by sync overhead).
4. **`integration_file_sync_bad_internet_scenario`** — queues three files,
   a background task fires `sync_trigger.trigger(None)` every 750 ms for the
   duration; asserts every file reaches `Done` and at least one was observed
   mid-pause.

They route their HTTP traffic to the central OMS through a toxiproxy daemon
to throttle the link. All other integration tests run without it.

Bring up toxiproxy before running this subset:

```bash
docker run --rm -p 8474:8474 -p 22220-22230:22220-22230 ghcr.io/shopify/toxiproxy:2.12.0
```

The test harness rewrites proxy bind addresses to `0.0.0.0` (so the port
mapping reaches the listener) and `localhost`/`127.0.0.1` upstreams to
`host.docker.internal` (so the container can reach the OMS central server
on the host). Both Docker Desktop and Podman expose `host.docker.internal`
to containers by default on macOS/Windows.

The tests connect to the admin API on `localhost:8474` by default — override
with `TOXIPROXY_ADMIN_URL` if the daemon lives elsewhere. Proxies listen on
ports in the `22220-22230` range, which is why the launch publishes that
whole range.

Run just these tests:

```bash
SYNC_URL=... SYNC_SITE_NAME=... SYNC_SITE_PASSWORD=... \
  cargo nextest run -p service --features integration_test file_sync_pause
```

### Running file-upload tests without legacy mSupply

The file-upload tests (`file_sync_pause.rs`) don't depend on mSupply-specific
behaviour — only on *something* answering the V5 endpoints that both the
central OMS and the test bootstrap call. The in-repo `mock_msupply` binary
covers that surface. Operator workflow (replaces step 3 above):

1. In its own terminal: `cargo run -p mock_msupply` — listens on
   `MOCK_MSUPPLY_PORT` (default `2048`).
2. Start the central OMS with `APP__SYNC__URL=http://localhost:2048` (same
   port the README's legacy mSupply example uses, so existing central
   configs keep working — central just sees a different process answering
   on that port). Central calls the mock during first-startup
   `request_and_set_site_info` and persists the result; subsequent restarts
   skip that step.
3. Start toxiproxy as in step 5.
4. Run the tests with `SYNC_URL` pointing at the mock:

```bash
SYNC_URL=http://localhost:2048 SYNC_SITE_NAME=mock SYNC_SITE_PASSWORD=mock \
  cargo nextest run -p service --features integration_test file_sync_pause
```

The mock accepts any credentials, so `SYNC_SITE_NAME` and `SYNC_SITE_PASSWORD`
just need to be set to non-empty strings.

Other integration tests still expect real legacy mSupply and should be run
against it (not against the mock).

See [server/mock_msupply/README.md](../../../../mock_msupply/README.md) for
the endpoints the mock implements and the env vars it accepts (including
`OMS_CENTRAL_URL` and `OMS_CENTRAL_USERNAME`, which let the mock report the
right `omSupplyCentralServerUrl` / `isOmSupplyCentralServer` values back to
each caller).

## 6 `run tests`

Via cli: `SYNC_SITE_PASSWORD="pass" SYNC_SITE_NAME="demo" SYNC_URL="http://localhost:2048" cargo nextest run integration_sync --features integration_test --package service`

These tests share a single 4D mSupply server and several process-global statics, so they must run serially. The `sync-integration` test-group in `server/.config/nextest.toml` enforces this — no `--test-threads=1` flag needed.

If you've set configurations in rust analyzer, can use inlay hint play and debug buttons in:

# How do they work (Central, Remote and open mSupply central)

There is a common `SyncRecordTester` trait with a `test_step_data` method returning a vector of TestData.
Each TestData struct contains the test data required for the various testing steps.
`TestData` is composed of upserts and deletes of central data, IntegrationRecords and graphql instructions to mutation records on openmSupply central server.

We have the ability to update and delete central data records directly on the original mSupply server (for test purposes, see syncV5API_test_upsert/delete in mSupply). Two endpoints are used for this `sync/v5/test/upsert` and `sync/v5/test/delete`

Central, remote and Open mSupply central tests use SyncRecordTester implementations to do integration tests.

A test sync site is created for each test
See `central_server_configurations.rs`

## Central

`First without re-initialisation`

For each step:

- Upsert central data specified in TestData
- Delete central data specified in TestData
- Sync
- Check IntegrationRecords in TestData against database

`Then with re-initialisation`
For each step:

- Upsert central data specified in TestData
- Delete central data specified in TestData
- Fully re-sync
- Check IntegrationRecords in TestData against database

## Remote

For each step:

- Upsert central data specified in TestData
- Delete central data specified in TestData
- Sync
- Upsert/Delete (on remote server) IntegrationRecords in TestData
- Sync
- Completely Re Sync
- Check IntegrationRecords in TestData against database

## Open mSupply Central (Central Data)

For each step:

- Upsert central data specified in TestData
- Request and wait for sync of open mSupply central server (which will sync the central data we just created in original mSupply central server)
- Perform graphql data mutations on open mSupply central server
- Sync (remote site)
- Check IntegrationRecords in TestData against database

## Open mSupply Central (Remote Data)

For each step:

- Upsert central data specified in TestData
- Request and wait for sync of open mSupply central server (which will sync the central data we just created in original mSupply central server)
- Perform graphql data mutations on open mSupply central server
- Sync (remote site)
- Upsert/Delete (on remote server) IntegrationRecords in TestData
- Sync (remote site)
- Completely Re Sync
- Check IntegrationRecords in TestData against database

# How do they work (Transfers)

Using `RequisitionTransferTester` and `InvoiceTransferTester` defined in transfer processors unit test.

These structs implement test methods that need to be run sequentially. They create, update, delete source and destination records and test that corresponding transfer records have been changed accordingly. Each of those methods accept connection or service provider to allow the operation to be executed on a chosen site.

Transfer integration test follow this pattern:

- Request creation of two sites on central server
- Add extra central data that is needed for transfer tests
- Create database for each site and instantiate connection, service_provider and processor_handle.
- Create instance of `TransferTester`
- Execute each method in `TransferTester` sequentially, passing through connection or service_provider for the site that should be doing that operation
- Synchronise and delay between each method execution (delay to allow both central server and remote server to do transfer operation)

# Extra info

- As per normal tests, you should be testing both databases
- When tests fail, you can uncomment `util::init_logger(util::LogLevel::Warn);`, in the test methods
- Sometimes central server seems to get overloaded and returns 'connection closed before message completed' or 'Site record locked preventing authentication update' for that reason 'with_retry' was added
- All ids and unique field must be generated (to avoid duplicates), single 4d data file should be able to run more then one full integration test.

Full test including integration can be run with:

```bash
SYNC_SITE_PASSWORD="pass" SYNC_SITE_NAME="demo" SYNC_URL="http://localhost:2048" cargo nextest run --features integration_test && SYNC_SITE_PASSWORD="pass" SYNC_SITE_NAME="demo" SYNC_URL="http://localhost:2048" cargo nextest run --features integration_test,postgres
```
