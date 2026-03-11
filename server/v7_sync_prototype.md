# V7 Sync Prototype

This document explains the changes introduced in this branch as a prototype for v7 sync. The goal is to demonstrate a new synchronisation architecture that is simpler to extend when adding new record types, and to address performance and maintainability issues with the existing sync approach.

---

## 1. Diesel Macros & Enum Storage Changes

### Problem

Previously, enums like `ChangelogTableName` used `diesel_derive_enum::DbEnum` with `#[DbValueStyle = "SCREAMING_SNAKE_CASE"]`. This stores enum values in the database using a Postgres/SQLite native enum mapping. Adding a new variant requires a database migration to alter the column type, and if one side of sync knows about a variant the other doesn't, deserialization fails.

### Solution: `diesel_string_enum!`

A new macro `diesel_string_enum!` (in `repository/src/diesel_macros.rs`) stores enum values as plain `Text` in the database via `strum` serialization (`snake_case` by default). This means:

- The database column is just `TEXT` — no migration needed when adding variants.
- Unknown values from newer software versions can be handled gracefully (via `strum::FromStr` fallback or an `Other` variant pattern).
- The enum still gets `AsExpression`, `ToSql` derives for Diesel compatibility.

**Before (DbEnum):**
```rust
#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ChangelogTableName {
    Invoice,
    StockLine,
    // ... adding a new variant here required a DB migration
}
```

**After (diesel_string_enum!):**
```rust
diesel_string_enum! {
    #[derive(Clone, Serialize, Eq, Hash, Deserialize, strum::EnumIter, TS)]
    pub enum ChangelogTableName {
        Invoice,
        StockLine,
        Unit,     // new — no migration needed
        Store,    // new — no migration needed
        // ...
    }
}
```

The `changelog` table's `table_name` column was changed from the mapped enum type to `Text` (see migration in `migrations/v2_15_00/sync_v7.rs` for the Postgres `ALTER TABLE` that converts it).

### `diesel_json_type!`

Another macro for structs/enums that need to be stored as JSON text in the database. Used for `SyncError` and `SyncRecordData` — serializes via `serde_json` into a `TEXT` column and deserializes back. This is used for the sync buffer's `data` column and sync log's `error` column.

### Row-level changes

Existing row files (e.g. `currency_row.rs`, `unit_row.rs`, `store_row.rs`) gained `Serialize` and `Deserialize` derives so they can be serialized to/from JSON for v7 sync transport. Enums within rows that already used `DbEnum` were left as-is for now (e.g. `InvoiceType`, `StoreMode`), since those tables haven't migrated their column types yet. The plan would be to gradually move them to `diesel_string_enum!` as well.

---

## 2. Trait Architecture for Minimal Boilerplate

The core design goal: **when adding a new record type to sync, the developer should only need to touch the row file and a translator registry**. The trait hierarchy achieves this through generic implementations.

### Trait Hierarchy

```
Record (low-level DB operations)
  │  find_by_id(), upsert_internal(), get_id()
  │
  ├── impl_record! macro — generates the impl for simple tables
  │   OR manual impl for tables with extra logic (e.g. ItemRow inserts item_link)
  │
SyncRecord : Record + Serialize + DeserializeOwned
  │  table_name(), sync_type(), changelog_extra()
  │
  ├── impl_central_sync_record! macro — for simple Central records
  │   OR manual impl for Remote records or those with extra changelog data
  │
Upsert (v7) — blanket impl for all SyncRecord + Send + Sync
  │  upsert() — looks up current site_id, calls upsert_internal + changelog insert
  │  upsert_sync() — used during integration with explicit source_site_id
  │
TranslatorTrait { type Item: SyncRecord + Upsert }
  │  BoxableSyncRecord blanket impl — serialize/deserialize via serde_json
  │
translators() registry — Vec<Box<dyn BoxableSyncRecord>>
```

### Demonstration crate

The `repository/src/syncv7/` module was added specifically to demonstrate this trait structure in action. It contains the core trait definitions (`Record`, `SyncRecord`, `Upsert`, `TranslatorTrait`, `BoxableSyncRecord`), the macros (`impl_record!`, `impl_central_sync_record!`), and the translator registry. Several existing row types (`CurrencyRow`, `UnitRow`, `StoreRow`, `LocationTypeRow`, `NameRow`, `ItemRow`, `StockLineRow`, `InvoiceRow`, `InvoiceLineRow`) were wired up to this new trait system to prove the pattern works end-to-end — from serialization through sync transport to integration on the other side.

### What it looks like for a simple Central record

`currency_row.rs` is a good example of the minimal pattern:

```rust
// 1. Row struct with Serialize/Deserialize
#[derive(Clone, Queryable, Insertable, Serialize, Deserialize, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = currency)]
pub struct CurrencyRow { /* fields */ }

// 2. Record trait — macro generates find_by_id, upsert_internal, get_id
impl_record! {
    struct: CurrencyRow,
    table: currency,
    id_field: id
}

// 3. SyncRecord + AutoImplementUpsert — macro generates both
impl_central_sync_record!(CurrencyRow, ChangelogTableName::Currency);

// 4. Translator for the registry
pub(crate) struct Translator;
impl TranslatorTrait for Translator { type Item = CurrencyRow; }
impl Translator {
    pub(crate) fn boxed() -> Box<dyn BoxableSyncRecord> { Box::new(Self) }
}
```

Then add `currency_row::Translator::boxed()` to the `translators()` vec in `syncv7/translator.rs`. That's it.

### Remote records (e.g. InvoiceRow)

For records that need `store_id` and `name_link_id` in the changelog (for sync filtering), `SyncRecord` is implemented manually instead of using the macro:

```rust
impl SyncRecord for InvoiceRow {
    fn table_name() -> &'static ChangelogTableName { &ChangelogTableName::Invoice }
    fn sync_type() -> &'static SyncType { &SyncType::Remote }
    fn changelog_extra(&self, _connection: &StorageConnection) -> Result<Option<ChangeLogInsertRowV7>, _> {
        Ok(Some(ChangeLogInsertRowV7 {
            store_id: Some(self.store_id.clone()),
            name_link_id: Some(self.name_link_id.clone()),
            ..Default::default()
        }))
    }
}
```

### Records with custom upsert logic

For records like `ItemRow` or `NameRow` that need extra work during upsert (e.g. inserting link rows), `Record` is implemented manually instead of using `impl_record!`:

```rust
impl Record for ItemRow {
    fn upsert_internal(&self, connection: &StorageConnection) -> Result<(), RepositoryError> {
        diesel::insert_into(item).values(self).on_conflict(item::id)
            .do_update().set(self).execute(connection.lock().connection())?;
        insert_or_ignore_item_link(connection, self)?; // extra logic
        Ok(())
    }
    // ... find_by_id, get_id
}
```

The existing `Repository` methods (e.g. `ItemRowRepository::upsert_one`, `find_one_by_id`) now delegate to `Record` trait methods, reducing duplication.

---

## 3. Dynamic Query System (`create_condition!`)

### Problem

V7 sync needs complex changelog filtering — e.g. "give me all central records, plus remote records belonging to stores on site X, plus transfer records where the destination is on site X". The existing approach used flat `EqualFilter` structs that couldn't express nested AND/OR logic.

### Solution

`dynamic_query.rs` introduces a `create_condition!` macro that generates a typed condition DSL for any Diesel query source. It creates:

- A `Condition` module with an `Inner` enum containing a variant per filterable field, plus `And`, `Or`, `True`, `False`.
- `FilterBuilder` trait impls for each field, providing methods like `equal()`, `not_equal()`, `any()`, `is_null()`, etc.
- A `to_boxed()` method that converts the enum tree into Diesel's `BoxedExpression`.

**Usage in changelog:**

```rust
create_condition!(
    Source,  // the Diesel query source (with joins)
    (site_id, i32, store::site_id),
    (cursor, number, changelog::cursor),
    (table_name, ChangelogTableName, changelog::table_name),
    (store_id, string, changelog::store_id),
    (transfer_site_id, i32, transfer_stores.field(store::site_id)),
    // ...
);
```

This generates `Condition::site_id::equal(5)`, `Condition::table_name::any(vec![...])`, etc., and they compose:

```rust
let filter = Condition::And(vec![
    Condition::table_name::any(table_names),
    Condition::Or(vec![
        site.remote_data_for_site(),
        central_data(),
    ]),
]);
```

The `Site` struct encapsulates common filter patterns:
- `remote_data_for_site()` — remote records belonging to stores on this site
- `transfer_data_for_site()` — transfer records destined for this site
- `all_data_for_site(is_initialising)` — combines central + remote + transfer data
- `filter_for_sync_type(direction, sync_type)` — per-type filtering with direction awareness

### Fast changelog deduplication

The query wraps a CTE-based approach (`changelog_deduped_fast`) that deduplicates changelog entries by `record_id` (keeping the latest cursor). This replaces the view-based deduplication which was slow for large changelogs.

---

## 4. Sync V7 Flow (Service Layer)

The sync flow lives in `service/src/sync_v7/` and follows four steps:

### 4.1 Push (remote → central)

1. Query local changelog for records that need pushing (using `Site` filters).
2. Serialize each record via the translator registry (`prepare()` → `serialize()`).
3. Send batches to central's `/central/sync_v7/push` endpoint.
4. Track progress via cursor (stored in `KeyValueStore` as `SyncPushCursorV7`).

### 4.2 Wait for Integration

After pushing, the remote polls the central to wait for integration to complete (the central integrates asynchronously). Timeout after 30 seconds.

### 4.3 Pull (central → remote)

1. Request batches from central's `/central/sync_v7/pull` endpoint.
2. Central generates batches using the same `SyncBatchV7::generate()` with site-specific filters.
3. Remote stores received records into `sync_buffer_v7` staging table.
4. Track progress via cursor (stored as `SyncPullCursorV7`).

### 4.4 Integrate

1. Read unintegrated rows from `sync_buffer_v7` (where `integration_datetime IS NULL`).
2. For each translator (in order), process matching buffer rows:
   - **Deserialize** JSON data back into the typed row struct.
   - **Validate** based on `SyncContext` (Central vs Remote) — checks store ownership, active stores, etc.
   - **Integrate** — calls `upsert_sync()` which does the DB upsert and changelog insert with `source_site_id`.
3. Mark success/error on the buffer row (`integration_datetime`, `integration_error`).

### Central side

`service/src/sync/sync_on_central_v7/mod.rs` handles the central endpoints:
- **push**: Receives buffer, upserts into `sync_buffer_v7`, spawns async integration.
- **pull**: Generates batches from changelog filtered for the requesting site.
- **site_status**: Returns site_id info.

Authentication uses the new `site` table (username + password_sha256).

---

## 5. New Tables (Migration)

`migrations/v2_15_00/sync_v7.rs` creates three tables:

| Table | Purpose |
|-------|---------|
| `sync_buffer_v7` | Staging area for received sync records before integration. Stores JSON data, source_site_id, integration status. |
| `sync_log_v7` | Detailed progress tracking for each sync run — per-step (push/pull/integrate) timing and progress counters. |
| `site` | Credentials for remote sites connecting to central (id, username, password_sha256). |

The migration also alters the `changelog` table's `table_name` column from enum type to `TEXT` (Postgres).

---

## 6. Sync Logging & Status

### SyncLogger (`sync_v7/sync_logger.rs`)

Tracks the four sync steps (Push, WaitForIntegration, Pull, Integrate) with:
- Start/finish timestamps per step
- Progress tracking (total, done) for Push/Pull/Integrate
- Error recording with step context
- Persists to `sync_log_v7` table after each update

### Sync Error: dramatically simplified persistence and mapping

In the old sync log (`sync_log_row.rs`), errors were stored as two separate columns: `error_message` (free-text `Nullable<Text>`) and `error_code` (a `DbEnum` called `SyncApiErrorCode` with variants like `ConnectionError`, `SiteNameNotFound`, etc.). This created several pain points:

- **Lossy storage**: The rich error context from Rust was flattened into a string message + enum code. Nested errors, structured data (e.g. which URL failed, which versions mismatched) were lost.
- **Manual mapping everywhere**: Converting between the actual service-layer errors and the `SyncApiErrorCode` enum required manual `match` arms in multiple places — once when saving to the DB, again when reading back and mapping to GraphQL variants. See `sync_api_error.rs`'s `from_sync_log_error()` which maps each `SyncApiErrorCode` variant to a `Variant` enum, and `from_sync_api_error()` which maps API error codes through yet another layer.
- **Adding a new error variant** meant updating the `SyncApiErrorCode` enum (requiring a DB migration since it's a `DbEnum`), updating the mapping in the logger, updating the mapping in GraphQL, etc.

In v7, `SyncError` is defined using `diesel_json_type!`, which means the entire error enum — including nested variants like `SyncRecordSerializeError`, `SiteLockError`, `GetCurrentSiteIdError`, and structured fields like `ConnectionError { url, e }` — is serialized as JSON into a single `TEXT` column:

```rust
// sync_log_v7 table
pub struct SyncLogV7Row {
    // ...
    pub error: Option<SyncError>,  // stored as JSON text, full fidelity
}
```

This means:
- **No mapping needed when saving**: The logger just stores `SyncError` directly — `serde_json` handles it.
- **No mapping needed when reading**: The row deserializes back to the full `SyncError` enum with all context preserved.
- **Adding a new error variant** just means adding it to the `SyncError` enum — no migration, no mapping updates. The JSON column accepts any shape.
- **GraphQL mapping is one place**: `from_sync_log_error_v7()` in `sync_api_error.rs` maps the full `SyncError` directly to GraphQL variants in a single match, with the `full_error` field carrying the complete error chain via `format_error()`.

### GraphQL Status

`graphql/general/src/queries/sync_status.rs` was extended to expose v7 sync status alongside existing v6 status. The `FullSyncStatusNode` includes per-step timing and progress.

---

## 7. Other Changes

### KeyValueStore caching

`key_value_store.rs` now has an in-memory cache (`RwLock<Option<HashMap<KeyType, KeyValueStoreRow>>>`) for frequently accessed values like `SettingsSyncSiteId`. This avoids repeated DB queries during sync when every record upsert needs to look up the current site ID.

### New KeyTypes

`SyncPushCursorV7` and `SyncPullCursorV7` — cursor positions for resumable v7 sync.

### Barcode scanner fix

`BarcodeScannerContext.tsx` — unrelated change, appears to be a bug fix for the barcode scanner context.

### CLI: `GenerateGraphqlTypescriptTypes` command

A new CLI action was added (`cli/src/generate_graphql_typescript_types.rs`) to generate TypeScript type definitions from Rust structs using `ts-rs`. This is needed because `SyncLogV7Row` derives `TS` (from the `ts-rs` crate), and its `error` field is `Option<SyncError>` — a rich Rust enum with nested error types. The `ts-rs` derive walks the entire type tree and exports matching TypeScript interfaces/unions. The CLI command runs `TStypes::export_all_to(path)` (defined in `graphql/core/src/lib.rs`) and then optionally formats the output with prettier. This gives the frontend type-safe access to the `SyncLogV7Row` structure including the full `SyncError` variant tree, without manual type duplication.

### Central configuration

`configuration/central.yaml` — added v7 sync configuration options.

---

## Summary: Adding a New Record Type to V7 Sync

1. Add `Serialize, Deserialize` derives to the row struct.
2. Implement `Record` (use `impl_record!` for simple cases, manual for custom upsert logic).
3. Implement `SyncRecord` (use `impl_central_sync_record!` for simple central records, manual for remote records or those needing `changelog_extra`).
4. Add a `Translator` struct with `TranslatorTrait` impl.
5. Add the translator to `translators()` in `syncv7/translator.rs`.
6. Add the table name variant to `ChangelogTableName` (no migration needed thanks to `diesel_string_enum!`).
7. Set the `ChangeLogSyncStyle` for the new variant in `sync_style()`.

That's it — the blanket impls on `Upsert`, `BoxableSyncRecord`, and the integration pipeline handle everything else automatically.
