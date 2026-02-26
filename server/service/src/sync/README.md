# Sync - Synchronisation

Open mSupply is often used in environments with intermittent and/or low bandwidth internet access and therefore needs to be accessible in an offline mode.
A mechanism that allows for this to happen is called **Synchronisation**, or **Sync** for short.

## Glossary

`site`: An instance of Open mSupply with one or more active stores

`remote site`: This is the same as a site, but we quite often refer to it as ‘remote site’ to emphasise that it’s not always accessible via the internet, and even though it’s part of the same system, it’s not always directly connected to the system.

`central server`/`configuration server`: The main site of mSupply system, this is where central data is configured, including credentials for remote sites, users and active store associations with sites. This is also the server that ‘drives’ synchronisation, all remote sites will synchronise with the central server, which in turn can forward records to other sites (for example, in case of transfer).

`active store`: A store can only belong to one site, even though data for any store is accessible on the central server, certain remote records that are owned by a store can only be edited on a site where the store is active.

`transfer`: Some data needs to be transferred between sites, for example a shipment from one site to another, we call these records transfers. See [processors](https://github.com/msupply-foundation/open-msupply/blob/bc83acbb3cd51fe3375ac01135c6eb880a793936/server/service/src/processors/README.md#L1) for more details

## Record Types

Records are treated differently by central server and remote sites based on data types, for example remote records belong to only one store and are only editable on a site where this store is active, whereas central data is only editable on a central server, the former usually syncs from remote site to central server whereas the later will only travel from central server to remote site.

`remote record/data`: Can only be owned and edited by one store, on a site where this store is active, this data typically travels from remote site where it’s created and edited, to central server, which in turn may decide to forward it to another remote site (in case of transfers). Shipment, requisition, stock_line are examples of remote record.

`central record/data`: This record is only editable on central server, and only travels in one direction, from central server to all remote sites. All central data will sync to all remote sites. Items and units are examples of central records.

`central-remote record/data`: These records are editable in the same way as central data, but it will only sync to remote sites where these records are relevant. For example, master_list or name_store_join.

`transfer record/data`: This is remote record but for a store that is not active on current site, this record is visible but not editable. For example, request requisition in response site.

`shared-remote record/data`: Editable on any site and sync to all sites. For example barcodes

`patient record/data`: Editable and accessible on any site where the patient is visible. Visibility in this case is determined by name store join. Prescribers, patients and patient documents are examples of patient record.

## Phases/Stages of Synchronisation:

`initialisation`: After the site is configured, it will first need to be initialised. This is where all relevant central and remote records are queued and sent to a remote site. Remote site is not ‘usable’ until initialisation stage is completed and all records are received

`operational`: Once initialised the site will be in an operational synchronisation phase, any changes to remote data will be sent to central server, and any changes to central data will travel to the remote site from the central server.

We also consider central server as `backup service` for remote sites, in case of data loss at remote site, it can be re-initialised (usually by clearing app data, and switching site back to initialisation phase). Central server protects multiple instances of Open mSupply syncing for the same site by recording a device identifier ( hardware id ) during each sync API request, if the hardware id does not match the previously stored hardware id then an error will be returned.

## How does a remote site work ?

A worker thread called [SynchroniserDriver](https://github.com/msupply-foundation/open-msupply/blob/bc83acbb3cd51fe3375ac01135c6eb880a793936/server/service/src/sync/synchroniser_driver.rs#L11) will run synchroniser every [interval_seconds](https://github.com/msupply-foundation/open-msupply/blob/bc83acbb3cd51fe3375ac01135c6eb880a793936/server/configuration/example.yaml#L20). [SynchroniserDriver](https://github.com/msupply-foundation/open-msupply/blob/bc83acbb3cd51fe3375ac01135c6eb880a793936/server/service/src/sync/synchroniser.rs#L88) will also listen to a message that can trigger sync manually at any time.

In the initialisation stage Synchroniser will first try to ask central server to begin initialisation, wait for initialisation to complete then pull central records, pull remote records, then translate and integrate all received records.

In the operational stage Synchroniser will first try to push remote records, then pull central records followed by pulling remote records and then translate and integrate all received records.

Cursor (CentralSyncPullCursor) is used to keep track of which central records needs to be pulled from central server

When records are received they are first placed in a [SyncBuffer](https://github.com/msupply-foundation/open-msupply/blob/bc83acbb3cd51fe3375ac01135c6eb880a793936/server/repository/src/db_diesel/sync_buffer.rs#L36), once all records are received, SyncBuffer is queried and translation and integration will take place. Translation and integration will happen in the order of record dependencies (all units will be translated and integrated first, then items, etc…). SyncBuffer record will be marked as integrated, and thus will not be processed during next translation and integration iteration. If there is an error during translation or integration, it will be recorded in the SyncBuffer and record will be skipped.

[SyncLogger](https://github.com/msupply-foundation/open-msupply/blob/bc83acbb3cd51fe3375ac01135c6eb880a793936/server/service/src/sync/sync_status/logger.rs#L35) will record each step's completion and progress, storing it in a database. Any blocking errors (like connection problems), will be recorded by SyncLogger.

## Sync Buffer

### What it is

The `sync_buffer` table is a staging queue for incoming sync records. When this site
receives data from the central server or from another remote site, those records are
written into `sync_buffer` immediately and intact. A separate integration step then
reads them out, translates them into the local schema, and writes them to their final
tables.

This two-phase design keeps the receive step simple and fast (just write JSON into a
table) and lets the integration step fail safely on individual records without losing
any data.

### Schema

| Field | Type | Description |
|---|---|---|
| `record_id` | TEXT (PK) | The ID of the record on the remote site. For `MERGE` actions a fresh UUID is generated locally to avoid colliding with an existing `UPSERT` row for the same record. |
| `table_name` | TEXT | Which table the record belongs to — e.g. `invoice`, `item`, `name`. Matches the values used in the `changelog` table. |
| `action` | Enum | One of `UPSERT`, `DELETE`, or `MERGE`. |
| `data` | TEXT | The full record payload as a JSON string. For `DELETE` records this is an empty object `{}`. |
| `received_datetime` | Timestamp | Set to the current UTC time at the moment of insertion. Records the exact time this site first received the data. |
| `integration_datetime` | Timestamp (nullable) | Set when the record has been processed, whether successfully or not. `NULL` means the record has not been processed yet and will be picked up in the next integration run. |
| `integration_error` | TEXT (nullable) | If processing failed, the error message is stored here. `NULL` on success. |
| `source_site_id` | INTEGER (nullable) | The numeric ID of the remote site that sent this record. `NULL` for records that came from the central server. |

### How records get into sync_buffer

Two pull paths, both writing through `SyncBufferRowRepository::upsert_many()`:

**Central data** (`central_data_synchroniser.rs`): The local site polls the central
server with `sync_api_v5.get_central_records()`. The API returns a batch of
`CommonSyncRecord` objects. Each is converted to a `SyncBufferRow` via
`CommonSyncRecord::to_buffer_row()` (in `api/common_records.rs`), which sets
`received_datetime = Utc::now()` and leaves `integration_datetime` and
`integration_error` as `NULL`. The batch is then bulk-inserted.

**Remote data** (`remote_data_synchroniser.rs`): The central server pushes a
`RemoteSyncBatchV5` containing records from other remote sites. The same conversion
runs, but `source_site_id` is populated with the originating site's ID so the system
knows not to re-broadcast those records back to that site later.

### How records are integrated into the database

Integration is orchestrated by `integrate_and_translate_sync_buffer()` in
`synchroniser.rs`. It runs after every successful pull and proceeds as follows:

**1. Fetch unprocessed records** — `get_ordered_sync_buffer_records()` queries rows
where `integration_datetime IS NULL` — everything not yet processed. Records are
returned in three separate ordered groups: upserts in dependency order, deletes in
reverse dependency order, and merges in dependency order.

**2. Resolve dependency order** — each translator declares which tables it depends on
via `pull_dependencies()`. For example, the `item` translator declares a dependency
on `unit`, so units are always integrated before items. A topological sort
(`pull_integration_order()`) across all translators produces the correct sequence,
preserving referential integrity even when a batch contains both parent and child
records.

**3. Match a translator and deserialise** — `all_translators()` returns every known
translator (one per table type). For each `sync_buffer` row, the system finds the
translator whose `table_names()` matches `sync_buffer.table_name`. That translator's
`try_translate_from_*_sync_record()` method deserialises the JSON `data` field into
the appropriate Rust struct and returns an `IntegrationOperation` (Upsert or Delete).
If no translator matches, an error is recorded on the row and processing continues.

**4. Write to the target table** — `integrate()` (in `translation_and_integration.rs`)
executes the operation through the same repository layer used by normal application
code — `upsert_one()` or `delete()` on the relevant row repository. On PostgreSQL
each record is wrapped in a savepoint so a failure on one record does not roll back
the entire batch. On SQLite savepoints are skipped.

**5. Mark the result** — after each record is processed:

- **Success** → `integration_datetime = NOW()`, `integration_error = NULL`
- **Failure** → `integration_datetime = NOW()`, `integration_error = <error message>`

Once `integration_datetime` is set the record is excluded from all future processing
runs. There is no automatic retry; a failed record requires manual investigation.

**6. Update the changelog** — for every successful integration,
`ChangelogRepository::set_source_site_id_and_is_sync_update()` is called on the
changelog entry created by the repository write in step 4. This marks the entry with
`is_sync_update = true` and records the originating site, so the outgoing sync queue
does not re-send that change back to where it came from.

### Key files

| File | Purpose |
|---|---|
| `server/repository/src/db_diesel/sync_buffer.rs` | `SyncBufferRow` struct, `SyncAction` enum, `SyncBufferRowRepository` CRUD |
| `server/service/src/sync/sync_buffer.rs` | Service helpers: `record_successful_integration`, `record_integration_error`, `get_ordered_sync_buffer_records` |
| `server/service/src/sync/api/common_records.rs` | `CommonSyncRecord::to_buffer_row` — converts the incoming API payload to a `SyncBufferRow` |
| `server/service/src/sync/central_data_synchroniser.rs` | Pulls records from the central server and writes them to `sync_buffer` |
| `server/service/src/sync/remote_data_synchroniser.rs` | Receives records pushed from remote sites and writes them to `sync_buffer` |
| `server/service/src/sync/synchroniser.rs` | `integrate_and_translate_sync_buffer` — top-level integration orchestration |
| `server/service/src/sync/translation_and_integration.rs` | Per-record translate → integrate loop, error handling, savepoint management |
| `server/service/src/sync/translations/mod.rs` | `SyncTranslation` trait, `all_translators()` registry, `pull_integration_order()` topological sort |

## Translations

[SyncTranslator](https://github.com/msupply-foundation/open-msupply/blob/bc83acbb3cd51fe3375ac01135c6eb880a793936/server/service/src/sync/translations/mod.rs#L236) trait is implemented for any given translation. Implementation of this trait should specify every detail of a sync operation for a particular record, including pull dependencies, matching table name, matching ChangeLog variant and instructions on how to translate a JSON version to upsertable/deletable data type. There are times where one JSON sync record will result in a number of upsert and delete operations, therefore the interface for translation methods return arrays of operations (see [program requisition settings translation](https://github.com/msupply-foundation/open-msupply/blob/bc83acbb3cd51fe3375ac01135c6eb880a793936/server/service/src/sync/translations/program_requisition_settings.rs#L121)).

SyncTranslator implementations are instantiated in an array. Using visitor pattern, this array of translators is used to check each translator against each sync buffer record when processing pulled records, and the resulting database operations are executed, we call the latter step integration.

The same array of translators is used to process ChangeLogs when pushing records to `central server`.

## ChangeLog

[ChangeLog](https://github.com/msupply-foundation/open-msupply/blob/bc83acbb3cd51fe3375ac01135c6eb880a793936/server/repository/src/db_diesel/changelog/changelog.rs#L11) table is used to keep track of records that need to be pushed to central server. Database triggers will insert updated/deleted record’s table name, uuid and auto increment sequence number in ChangeLog table. During push operation we use a cursor to ChangeLog’s sequence number (RemoteSyncPushCursor) to figure out which records need to be pushed.

To avoid re-pushing remote/patient and transfer records that have just arrived via sync, we use is_sync_updated field on that record, which is toggled to “true” during sync operation and toggled to “false” when record was edited outside of sync.

Also after initialisation, we update RemoteSyncPushCursor to point to the end of the ChangeLog sequence, to avoid resyncing records that have just arrived.

## Integrations

Translations will return an array of boxed [Upsert or Delete](https://github.com/msupply-foundation/open-msupply/blob/bc83acbb3cd51fe3375ac01135c6eb880a793936/server/repository/src/lib.rs#L49) traits, which are stored in IntegrationOperation enum. These traits are implemented by every sync data type, in the repository layer.
To ensure that the whole record in its entirety (invoice and all it’s lines) is available after synchronisation, we integrate everything in one big transaction. However this does slow down the initialisation phase, and thus transaction is skipped during initialisation, this is safe because the app is not available during the initialisation stage.

## Example of Adding translation

Please see below commit for an example of adding a new table and relative translations (it’s only an example and assumes that central server can already handle this record).

[Add asset table](https://github.com/msupply-foundation/open-msupply/commit/dfa5b8e4a4d0a906b0c19f3ee00e194344834508)

[Add translations](https://github.com/msupply-foundation/open-msupply/commit/a9b3d90a597f9670687f0fc26a5632310fe6b4c9) `note - change log upsert with triggers has been replaced with changelog upsert via repository, see latest version of the file for details`

[Add asset log reason](https://github.com/msupply-foundation/open-msupply/commit/507681182ec39f716df73b7487167057b6731e0e) (Shows - Changelog Trigger, Upsert Trait, Translation, etc)

## Tutorial on adding V6 sync central record

In google drive, under `Knowledge Base > Sync System > How to add v6 sync for central data`

[Add om report](https://github.com/msupply-foundation/open-msupply/commit/04a37a88148bf7315e79b97ba753a6d4536d1428)

[Add om report translations](https://github.com/msupply-foundation/open-msupply/commit/bd73a2be5cf33670635e55709a120d2145a98731)

[Add tests](https://github.com/msupply-foundation/open-msupply/commit/6ef0d9952ac89d3eb31fa5ac1893e154ad8319ee)

## Central Servers

In order to use Open mSupply a central server is required. This is used to configure central data and as a central hub for synchronisation of records from remote sites via the REST API that it hosts.

Original mSupply central server is implemented in 4D, located in this private repository.

Our plan is to transition to an open source implementation of a central server, having a shared code base with Open mSupply. For this to happen we need to run two central servers in parallel, in which case an Open mSupply central server will still sync data from original mSupply central server (as if it was a remote site) and at the same time allow for new central records types (like pack variants and asset catalog) to be configured, while exposing sync API for consumption of remote Open mSupply sites.

## Open mSupply Central Server

Existing remote sites sync to both Original and Open mSupply at the same time, pushing different records to different endpoints, v5 API for legacy mSupply central server and v6 API for open mSupply central server.

An instance of omSupply can be configured to identify as omSupply central server by updating the site configuration in legacy mSupply. Special -> Synchronisation -> {site}, `Site is open mSupply central server` checked and `This site url` the url with which other remote sites can reach omSupply central server

When a remote site syncs to Open mSupply’s central server it passes through original mSupply sync settings, including the remote site’s credentials and its own hardware id; Open mSupply central server will use these credentials to check validity of the site against the original mSupply central server.

Open mSupply's central server uses ChangeLog to keep track of which records have been updated in order to figure out what needs to be sent to a remote site. And the remote site keeps track of a cursor (SyncPullCursorV6) to ensure only new updates are synced from the central server.

## ChangeLog instead of queue

In Original mSupply central server, remote/transfer/shared records are added to a sync queue for the related remote site. This queue is used to figure out what should go to what site when there are sync API requests from remote sites.

In Open mSupply, ChangeLog is used for this. The logic, of determining which records should go to which site, happens in one sql statement on the `ChangeLog` table, which would look something like this:

```SQL
SELECT * FROM changelog_dedup
WHERE cursor > {remote site SyncPullCursorV6} AND last_sync_site_id != {remote site id}
AND
(
    (table_name in {central record names})
    OR
	(table_name in {remote record names}  AND store_id IN {active stores on remote site})
    OR
	(table_name in {transfer record names}  AND name_id IN {name_ids of active stores on remote site})
    OR
	// Special cases
	(table_name in {patient record name} AND patient_id IN {select name_id from name_store_join where store_id in {active stores on remote site})
)
```

## Diagrams

![omSupply Remote Site Sync](./doc/omSupply_sync_remote.drawio.svg)

## Central Sync API

A postman collection and environment for Original Central Sync API is available [here](https://github.com/msupply-foundation/msupply/tree/master/Postman)

And for Open mSupply central server [here](https://github.com/msupply-foundation/open-msupply/blob/562be1cffb6f655f584e1a543416d6428dc91d96/server/postman/Open%20mSupply%20REST.postman_collection.json)

## Versioning

Version number is set in [settings.rs](./settings.rs) and will be set in header to allow central server to check compatibility.
Central server records max and min version it's compatible with, and a simple comparison determines compatibility (`min_version <= site_version <= max_version`).
See [Versioning KDD](../../../../decisions/version-compatibility.md) and `syncV5API_checkVersion` on central server for more details, extract:

**When to increment max_version and min_version**

When server is changed in such a way that all previous versions of client are not compatible and client needs to be updated
to match the server. For example:

- adding a new compulsory header
- adding compulsory field to PUSH body
- changing the shape of PULL body
- adding a compulsory not null field to a table, where default value cannot be deduced
- changing authentication method

**When to increment max_version only**

When change allows for previous version to still work without logical or syntax errors. For example:

- adding a new optional field or a field in OG or OMS central where default value can be deduced
- adding a new table
- adding new optional header

### V6 Versioning

The same versioning pattern also applies to the V6 sync (syncing with Open mSupply Central). The V6 sync version of the remote site is set in [settings.rs](./settings.rs), and checked in [sync_on_central](./sync_on_central/mod.rs)

## Debugging sync::test::pull_and_push::test_sync_pull_and_push

This test is a little tricky to debug when it fails, as the error messages are not very specific. Here are two strategies that can help isolate the root cause:

1. Find the functions that may be being called by that test, and put in a println! statement to each one, then run the test again - that will show you which functions are called, how many times, and in what sequence.
2. Search the error message displayed in the console for SQL errors. For example, 'FOREIGN KEY CONSTRAINT FAILED' and similar. If you find one, this means some of the data our tests cases are inserting don't fulfil one of the constraints of the table you're testing. To check out the constraints, open the database in a database browser (we often use [DBeaver](https://dbeaver.io/), or [DB Browser for SQLite](https://sqlitebrowser.org/)) and generate the table's DDL (Data Description Language).
