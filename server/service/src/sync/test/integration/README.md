# Sync Integration Tests

# How to run

1. Requires 'integration_test' feature
2. Requires env vars to be present (for central server credentials)
3. Running central server
4. Run tests

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
`"rust-analyzer.runnableEnv": { "SYNC_URL": "http://localhost:2048", "SYNC_SITE_NAME": "demo","SYNC_SITE_PASSWORD": "pass" }`

## 3 `central server`

Requires a legacy mSupply Desktop Central Server

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

## 4 `run tests`

Via cli: `SYNC_SITE_PASSWORD="pass" SYNC_SITE_NAME="demo" SYNC_URL="http://localhost:2048" cargo test integration_sync  --features integration_test`

If you've set configurations in rust analyzer, can use inlay hint play and debug buttons in:

- integration/remote/test
- integration/central/test
- integration/transfer/requisition
- integration/transfer/shipment

# How do they work (Central and Remote)

There is a common `SyncRecordTester` trait with a `test_step_data` method returning a vector of TestData.
Each TestData struct contains the test data required for the various testing steps.
`TestData` is composed of upserts and deletes of central data and IntegrationRecords.

We have the ability to update and delete central data records directly on the server (for test purposes, see syncV5API_test_upsert/delete in mSupply). Two endpoints are used for this `sync/v5/test/upsert` and `sync/v5/test/delete`

Central and remote tests use SyncRecordTester implementations to do integration tests.

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

# How do they work (Transfers)

Using `RequisitionTransferTester` and `ShipmentTransferTester` defined in transfer processors unit test.

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
SYNC_SITE_PASSWORD="pass" SYNC_SITE_NAME="demo" SYNC_URL="http://localhost:2048" cargo test  --features integration_test && SYNC_SITE_PASSWORD="pass" SYNC_SITE_NAME="demo" SYNC_URL="http://localhost:2048" cargo test --features integration_test,postgres
```
