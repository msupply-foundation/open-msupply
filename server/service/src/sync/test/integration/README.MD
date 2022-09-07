# Sync Integration Tests

# How to run

1. Requires 'integration_test' feature
2. Requires env vars to be present (for central server credentials)
3. Running central server
4. Run tests

## 1 `integration_test` feature

Either with cli or rust analyzer settings:
* in vscode, `cmd+,`
* top right `Open Settings (JSON)`
* add `"rust-analyzer.cargo.features": ["integration_test"]` (might need to restart vscode)

## 2 `env vars` for sync credentials

The following environment variables should be provided for sync integration test:

SYNC_SITE_PASSWORD
SYNC_SITE_NAME
SYNC_URL

As `1`, can provide via cli or rust analyzer:
`"rust-analyzer.runnableEnv": { "SYNC_URL": "http://localhost:2048", "SYNC_SITE_NAME": "demo","SYNC_SITE_PASSWORD": "pass" }`

## 3 `central server`

Use branch `11087-Sync-v5-integration-test-endpoint` (TODO UPDATE)

Only data that needs to be present on central server site is a new sync site:
* Create new data files
* Change user permissions to allow `Add/edit sync sites`
* In preferences
  * Register
  * Turn on both checkboxes in Synchronisation (under General)
`
  * Under server check `Start web server ..`, change port from 0 and `Start Web Server`
* In Synchronisation window add site and add store to that site

`IMPORTANT` make sure to run `syncV5API_test_enable` method (and if you restart the data file have to re-run this method)

## 4 `run tests` 

Via cli: `SYNC_SITE_PASSWORD="pass" SYNC_SITE_NAME="demo" SYNC_URL="http://localhost:2048" cargo test integration_sync  --features integration_test`

If you've set configurations in rust analyzer, can use inlay hint play and debug buttons in:
* integration/remote/test
* integration/central/test

# How do they work 

There is a common `SyncRecordTester` trait with a `test_step_data` method returning a vector of TestData.
Each TestData struct contains the test data required for the various testing steps.
`TestData` is composed of upserts and deletes of central data and IntegrationRecords. 

We have the ability to update and delete central data records directly on the server (for test purposes, see syncV5API_test_upsert/delete in mSupply). Two endpoints are used for this `sync/v5/test/upsert` and `sync/v5/test/delete`

Central and remote tests use SyncRecordTester implementations to do integration tests.

A test sync site is created for each test 
See `central_server_configurations.rs` comment for site creation info

## Central

`First without re-initialisation`

For each step:
* Upsert central data specified in TestData
* Delete central data specified in TestData
* Sync
* Check IntegrationRecords in TestData against database

`Then with re-initialisation`
For each step:
* Upsert central data specified in TestData
* Delete central data specified in TestData
* Fully re-sync
* Check IntegrationRecords in TestData against database

## Remote

For each step:
* Upsert central data specified in TestData
* Delete central data specified in TestData
* Sync
* Upsert/Delete (on remote server) ItegrationRecords in TestData
* Sync
* Completely Re Sync
* Check IntegratonRecords in TestData against database

# Extra info

* As per normal tests, you should be testing both databases
* When tests fail, you can uncomment `util::init_logger(util::LogLevel::Warn);`, in `test_remote_sync_record` and `test_central_sync_record` methods;
* Sometimes central server seems to get overloaded and returns 'connection closed before message completed' or 'Site record locked preventing authentication update' for that reason 'with_retry' was added

Full test including integration can be run with:
```bash
SYNC_SITE_PASSWORD="pass" SYNC_SITE_NAME="demo" SYNC_URL="http://localhost:2048" cargo test  --features integration_test && SYNC_SITE_PASSWORD="pass" SYNC_SITE_NAME="demo" SYNC_URL="http://localhost:2048" cargo test --features integration_test,postgres 
```