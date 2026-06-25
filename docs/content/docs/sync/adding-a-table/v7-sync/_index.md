+++
title = "Adding a new table (V7 sync)"
weight = 10
sort_by = "weight"
template = "docs/section.html"
+++

# Adding a new table and making it sync over V7

This is a reference walkthrough for the **simplest greenfield case**: you are adding a
**brand-new table** that does not exist anywhere yet, and you want it to sync over **V7**
(the modern omSupply↔omSupply sync protocol). It does **not** need legacy v5/v6 (central
mSupply Classic) support.

> If your table _already_ syncs over v5/v6 in central mSupply and you only need to integrate
> it, read [Integrating a v5/v6 table](../v5-v6-and-v7/) instead — that case adds
> a legacy translation on top of everything here.

We use a fictional table `widget` throughout. Substitute your real table name. Paths are
relative to `server/`.

For the underlying concepts referenced below (the changelog, sync styles, integration order,
the sync buffer), see the [Sync V7 specification](../../v7/) and the
[Sync styles reference](../../sync_styles/).

## Mental model

Adding a V7-syncing table touches **three layers**, in this order:

1. **Repository layer** — the table exists in the DB and in Rust (migration, row struct,
   repository, module wiring).
2. **Changelog layer** — every sync-able row writes a `changelog` entry on upsert/delete, and
   the table is classified by _how_ it syncs (`sync_style`).
3. **V7 sync layer** — pull (deserialize incoming JSON → row) and push (row → JSON), plus the
   FK-ordered integration list.

V7 sync is **changelog-driven**: there are no per-table translator objects like the legacy
system. Instead there is one big `match table_name { ... }` in a few central files that you
add an arm to.

## Checklist (TL;DR)

| # | File | What you add |
|---|------|--------------|
| 1 | `repository/src/migrations/v3_00_00/add_widget_table.rs` *(new)* | `CREATE TABLE widget`; PG: `ALTER TYPE changelog_table_name ADD VALUE 'widget'` |
| 2 | `repository/src/migrations/v3_00_00/mod.rs` | register the migration fragment |
| 3 | `repository/src/db_diesel/widget_row.rs` *(new)* | `table!`, `WidgetRow`, `WidgetRowRepository`, `Upsert`/`Delete` impls |
| 4 | `repository/src/db_diesel/mod.rs` | `pub mod widget_row;` + `pub use widget_row::*;` |
| 5 | `repository/src/db_diesel/changelog/changelog.rs` | add `Widget` to the `ChangelogTableName` enum |
| 6 | `repository/src/db_diesel/changelog/generate_changelog.rs` | `impl WidgetRow { fn generate_changelog(..) }` |
| 7 | `repository/src/db_diesel/changelog/sync_style.rs` | add a `Widget => SyncStyle { .. }` arm |
| 8 | `repository/src/db_diesel/changelog/batch_query.rs` | add `Widget(WidgetRow)` to the `Row` enum **and** a `fetch_rows_for_table` arm (for push) |
| 9 | `repository/src/syncv7/integration_order.rs` | insert `Widget` into `INTEGRATION_ORDER` in FK order |
| 10 | `service/src/sync_v7/serde.rs` | add arms to `serialize()` (push) and `deserialize()` (pull) |
| 11 | `service/src/sync_v7/validate_translate_integrate.rs` | add a `translate_delete()` arm (if the table supports deletes) |
| 12 | `repository/src/migrations/v3_00_00/seed_sync_request_<table>.rs` *(new — only if v7 sites already exist)* | seed a `sync_request` (via `helpers::seed_sync_request_for_table`) so already-migrated sites re-pull historic rows |

Two compile-time/test guards will tell you if you missed something:

- The `Row` enum and the two `match`es in `serde.rs` / `batch_query.rs` are **non-exhaustive
  on purpose** — adding a `ChangelogTableName` variant makes them fail to compile until you
  add the arm. Lean on the compiler.
- `integration_order::integration_order_is_up_to_date` (a test) fails if a `ChangelogTableName`
  is neither in `INTEGRATION_ORDER` nor in `NOT_YET_IN_V7`, or if the order violates a real FK.

---

## Step 1 — Migration: create the table

Migrations live in versioned folders (`repository/src/migrations/vX_YY_ZZ/`). The latest is
`v3_00_00`. Add a new **fragment** file there.

`repository/src/migrations/v3_00_00/add_widget_table.rs` *(new file)*

```rust
use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_widget_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE TABLE widget (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                store_id TEXT REFERENCES store(id),
                created_datetime {DATETIME} NOT NULL
            );
            "#
        )?;

        // Postgres stores changelog_table_name as an ENUM, so the new value
        // must be registered before any changelog row can reference it.
        // SQLite stores it as TEXT, so this is Postgres-only.
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'widget';"#
            )?;
        }

        Ok(())
    }
}
```

Notes:

- `{DATETIME}`, `{DOUBLE}`, etc. are placeholders the `sql!` macro substitutes per backend
  (`TIMESTAMP`/`DATETIME`, `DOUBLE PRECISION`/`REAL`). Use them so the SQL runs on both
  Postgres and SQLite.
- The `ALTER TYPE ... ADD VALUE` is **required** for any table that writes to the changelog
  (i.e. anything that syncs). Forgetting it passes SQLite tests but breaks on Postgres at
  runtime.
- Triggers are **not** used for the changelog any more (they were removed in `v2_02_00`).
  Changelog rows are written programmatically by the repository (Step 3).

Register the fragment in `repository/src/migrations/v3_00_00/mod.rs`:

```rust
mod add_widget_table; // <-- add

impl Migration for V3_00_00 {
    fn version(&self) -> Version {
        Version::from_str("3.0.0")
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            // ...existing fragments...
            Box::new(add_widget_table::Migrate), // <-- add
        ]
    }
}
```

> If you're shipping in a version that doesn't have a folder yet, create
> `vX_YY_ZZ/mod.rs` with a `VX_YY_ZZ` struct and register it in
> `repository/src/migrations/mod.rs` (both the `mod` declaration and the `migrate()` vec).

---

## Step 2 — Row definition & repository

`repository/src/db_diesel/widget_row.rs` *(new file)*

```rust
use crate::{
    ChangelogRepository, ChangelogSyncType, Delete, RepositoryError, RowActionType, RowOrId,
    SourceSiteId, StorageConnection, Upsert,
};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    widget (id) {
        id -> Text,
        name -> Text,
        store_id -> Nullable<Text>,
        created_datetime -> Timestamp,
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = widget)]
#[diesel(treat_none_as_null = true)]
pub struct WidgetRow {
    pub id: String,
    pub name: String,
    pub store_id: Option<String>,
    pub created_datetime: NaiveDateTime,
}

pub struct WidgetRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> WidgetRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        WidgetRowRepository { connection }
    }

    // `_upsert_one` does the raw DB write only — no changelog. Sync paths
    // call this and supply their own changelog (see the Upsert impl).
    pub fn _upsert_one(&self, row: &WidgetRow) -> Result<(), RepositoryError> {
        diesel::insert_into(widget::table)
            .values(row)
            .on_conflict(widget::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    // The public upsert: write the row AND a changelog entry authored by this site.
    pub fn upsert_one(&self, row: &WidgetRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = WidgetRow::generate_changelog(
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<WidgetRow>, RepositoryError> {
        Ok(widget::table
            .filter(widget::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?)
    }

    // Used by the changelog push path (batch_query::fetch_rows_for_table).
    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<WidgetRow>, RepositoryError> {
        Ok(widget::table
            .filter(widget::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn _delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(widget::table.filter(widget::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

// --- Sync traits -----------------------------------------------------------
// `Upsert`/`Delete` are how the sync integration writes rows. The crucial bit
// is the `ChangelogSyncType` match: V7 hands you a fully-formed changelog row
// (already classified upstream), V5/V6 asks you to generate one. A V7-only
// table still implements both arms — the V5/V6 arm is just unused.

impl Upsert for WidgetRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        WidgetRowRepository::new(con)._upsert_one(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => WidgetRow::generate_changelog(
                RowOrId::Row(self),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test helper.
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            WidgetRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct WidgetRowDelete(pub String);
impl Delete for WidgetRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => WidgetRow::generate_changelog(
                RowOrId::Id(&self.0),
                con,
                RowActionType::Delete,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        WidgetRowRepository::new(con)._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            WidgetRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
```

Wire the module into `repository/src/db_diesel/mod.rs`:

```rust
pub mod widget_row;      // alphabetical with the other `pub mod *_row;`
// ...
pub use widget_row::*;   // alphabetical with the other re-exports
```

> **Hard vs soft delete.** The example above is a hard delete. Many central tables (e.g.
> `campaign`) instead carry a `deleted_datetime` column and "delete" by upserting with that
> set (`mark_deleted`). If you go soft-delete, you don't implement `Delete` — you just
> upsert. Pick based on how the table behaves elsewhere.

---

## Step 3 — Changelog enum & `generate_changelog`

### 3a. `ChangelogTableName`

`repository/src/db_diesel/changelog/changelog.rs` — add a variant (alphabetical). The
`snake_case` serialization (`Widget` → `"widget"`) is automatic and **must** match the table
name used in the migration's `ALTER TYPE` and in the `table!` macro.

```rust
diesel_string_enum! {
    #[derive(Clone, Eq, Hash, Serialize, Deserialize, strum::EnumIter, TS)]
    #[strum(serialize_all = "snake_case")]
    pub enum ChangelogTableName {
        // ...
        Widget, // <-- add
        // ...
    }
}
```

### 3b. `generate_changelog`

`repository/src/db_diesel/changelog/generate_changelog.rs` — add an `impl` block. There are
two flavours in this file; pick by whether your table is store-scoped:

**Store-scoped table** (has a `store_id`, like our `widget`) — use `RowOrId` so the changelog
can be filtered to the owning store's site:

```rust
impl WidgetRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<WidgetRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(id) => &WidgetRowRepository::new(con)
                .find_one_by_id(id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Widget,
            record_id: row.id.clone(),
            row_action: action,
            store_id: row.store_id.clone(),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}
```

**Central / non-store table** (distributed to everyone, like `campaign`/`currency`) — the
simpler signature that just takes the id and sets no `store_id`:

```rust
impl WidgetRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Widget,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}
```

> Keep the signature you choose here consistent with how you call it in Step 2
> (`RowOrId::Row(..)` vs `row.id.clone()`).

### 3c. `sync_style` — classify _how_ the table syncs

`repository/src/db_diesel/changelog/sync_style.rs` is the single source of truth for **how**
a table moves through sync. Add a match arm:

```rust
// Store-owned data this site authors and that V7 distributes to the owning site:
Widget => SyncStyle {
    authoring: vec![RemoteOwned],
    distribution: vec![D::RemoteOwned],
    transport: V5,
},
```

- **`authoring`** — what central accepts when validating an incoming push (a sanity check).
- **`distribution`** — which sites central forwards the row to (drives the changelog filters).
- **`transport`** — `V5`, `V6`, or `V5_V6`. For a **V7-only greenfield table** that is still
  carried by the V5-style record envelope, mirror an existing store-owned table such as
  `StockRelocation`/`Stocktake` (they use `transport: V5`). For pure-central data authored on
  central and pushed to everyone (like `Campaign`), use `authoring: vec![Central]`,
  `distribution: vec![D::Central]`.

> Copy the arm from the most similar existing table rather than reasoning from first
> principles — `Store`, `Item`, `Currency` for central data; `StockRelocation`, `Stocktake`,
> `Location` for store-owned data.

---

## Step 4 — Changelog push plumbing (`batch_query.rs`)

On **push**, the changelog cursor query must load the actual row for each changelog entry and
wrap it in the `Row` enum. This is in `repository/src/db_diesel/changelog/batch_query.rs` and
is easy to forget — the V7 serialize path depends on it.

Add the enum variant:

```rust
pub enum Row {
    // ...
    Widget(WidgetRow), // <-- add
    // ...
}
```

…and the loader arm in `fetch_rows_for_table`:

```rust
ChangelogTableName::Widget => {
    for r in WidgetRowRepository::new(connection).find_many_by_id(chunk)? {
        out.insert(r.id.clone(), Row::Widget(r));
    }
}
```

> The `Row` enum is the reason the compiler catches a half-finished integration: it has no
> catch-all arm, so adding a `ChangelogTableName` variant breaks compilation in both
> `batch_query.rs` and `serde.rs` until you add the matching arms.

---

## Step 5 — V7 integration order

`repository/src/syncv7/integration_order.rs` — insert `Widget` into `INTEGRATION_ORDER` so
that **its FK parents appear before it** (the loop integrates upserts top-to-bottom and
deletes bottom-to-top). `widget` references `store`, so it must come after
`ChangelogTableName::Store`:

```rust
pub const INTEGRATION_ORDER: &[ChangelogTableName] = &[
    // ...
    ChangelogTableName::Store,
    // ...
    ChangelogTableName::Widget, // after Store (its FK parent)
    // ...
];
```

The test `integration_order_is_up_to_date` walks the **real DB foreign-key graph** and fails
if your placement violates an FK, if you left the table out entirely, or if there's a
duplicate. Run it after editing:

```sh
cd server && cargo nextest run integration_order
```

> `NOT_YET_IN_V7` is an escape hatch for tables that exist in the changelog enum but aren't
> wired for V7 yet. A new V7 table goes in `INTEGRATION_ORDER`, **not** here.

---

## Step 6 — V7 serialize / deserialize (`serde.rs`)

`service/src/sync_v7/serde.rs` holds the two big matches.

**Push (`serialize`)** — `Row` → JSON:

```rust
pub fn serialize(row: &Row) -> Result<serde_json::Value, SyncRecordSerializeError> {
    let map_serde_err = |e: serde_json::Error| SyncRecordSerializeError::SerdeError(e.to_string());
    match row {
        // ...
        Row::Widget(r) => serde_json::to_value(r).map_err(map_serde_err), // <-- add
        // ...
    }
}
```

**Pull (`deserialize`)** — incoming JSON → `Box<dyn Upsert>`. For a plain table with no
cross-site fix-ups, use the generic `from_value::<WidgetRow>`:

```rust
let upsert = match table_name {
    // Special (custom logic) tables `return` early...
    // Basic tables:
    // ...
    ChangelogTableName::Widget => from_value::<WidgetRow>(data), // <-- add
    // ...
}?;
```

> **When do you need a custom translation instead of `from_value`?** Only if incoming data
> must be transformed before it can be stored on this site — e.g. nulling a FK that points at
> a record this site doesn't own (`invoice_line.rs`), or emitting an extra side-effect record
> (`store.rs`). Those live in `service/src/sync_v7/translations/`, are registered as a `pub
> mod` in that folder's `mod.rs`, and are dispatched via a `return translate_widget(...)` arm
> in `deserialize`. A greenfield table almost never needs this.

---

## Step 7 — V7 delete translation

`service/src/sync_v7/validate_translate_integrate.rs` → `translate_delete()` maps a
`ChangelogTableName` + record id to a boxed `Delete`. If your table supports hard deletes, add
an arm:

```rust
ChangelogTableName::Widget => Box::new(WidgetRowDelete(id)),
```

If your table is **soft-delete only** (no `Delete` impl), it never produces a delete
changelog, so you don't add anything here — but confirm that's actually true for your table.

---

## Step 8 — Re-sync for sites already on V7 (`sync_request` migration)

**Only needed if V7 sites already exist in the wild.** Skip it for a table that ships before
any site has migrated to V7 — the steps above are then sufficient.

The trap: when a remote migrated from v5/v6 to V7, its V7 pull cursor was seeded from the v6
cursor position, i.e. "up to date with central as of the V7 cutover". A normal V7 pull starts
from that cursor and **never re-pulls anything behind it**. So a table that is *new in V7*
(it had no v5/v6 translator, so was never pulled before) has all its historic rows sitting
behind the cursor — already-migrated sites get only rows changed *after* your migration, and
silently miss everything older.

The fix is the same `sync_request` mechanism used for store transfers: seed one auxiliary
sync request per affected table in a migration, so the `sync_request_runner` re-pulls those
rows (filtered to the table, from cursor 0) on the next tick — without re-initialising the
site or touching the main cursor.

Two shared helpers in `repository/src/migrations/helpers.rs` do the work, so the migration is
tiny:

- `pull_has_started(connection)` — true on an existing install (a pull has run on v7 or v5/v6),
  false on a fresh one. Use it to skip the seed on fresh installs.
- `seed_sync_request_for_table(connection, table_name)` — inserts the `sync_request` row
  (`reference_id = NULL`, `pull_filter` restricted to that table, from cursor 0).

`repository/src/migrations/v3_00_00/seed_sync_request_widget.rs` *(new file)*

```rust
// Seeds a sync_request on existing remote installs so `widget` rows that
// predate this site's v7 migration get re-pulled by the sync_request_runner.
// Skipped on fresh installs: the upcoming initial sync covers everything.
use crate::{
    migrations::{
        helpers::{pull_has_started, seed_sync_request_for_table},
        *,
    },
    ChangelogTableName,
};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "seed_sync_request_widget"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Fresh install? The initial sync covers everything — nothing to backfill.
        if !pull_has_started(connection)? {
            return Ok(());
        }

        seed_sync_request_for_table(connection, ChangelogTableName::Widget)?;
        Ok(())
    }
}
```

Register the fragment in `repository/src/migrations/v3_00_00/mod.rs` exactly like the table
migration in Step 1. The user-table version of this exact migration,
`seed_sync_request_user_tables.rs`, is the reference (it seeds three tables in a loop).

Key points:

- `seed_sync_request_for_table` sets `reference_id = NULL` so the `sync_request_runner` groups
  it fresh and assigns a reference on first run, and restricts `pull_filter` to just this table
  so you don't re-pull the world.
- **Always guard on `pull_has_started()`** — skip on fresh installs, where the initial sync
  already covers everything and a queued request would sit unrun.
- This applies equally when you **turn on V7 coverage for an existing table** after central's
  V7 cutover, not only to brand-new tables.

> See the [Re-sync after a v7 migration](../../v7/#re-sync-after-v7-migration) section of the
> V7 spec for the full rationale (the seeded-cursor problem and the `sync_request` recovery path).

---

## Verifying

```sh
cd server
cargo nextest run integration_order        # FK order / completeness guard
cargo nextest run sync_v7                   # V7 sync tests
cargo build --features postgres             # catches the missing ALTER TYPE / enum arms
```

The compiler is your friend here: a missing `Row` / `serialize` / `deserialize` /
`fetch_rows_for_table` arm is a hard compile error, and the integration-order test catches
the rest. If those four pass, the table is fully wired for V7.

## Common mistakes

- **Forgetting the Postgres `ALTER TYPE changelog_table_name ADD VALUE`** — green on SQLite,
  runtime failure on Postgres.
- **Wrong `sync_style` transport/distribution** — the table compiles and "syncs" but rows go
  to the wrong sites (or nowhere). Copy from the closest existing table.
- **Placing the table wrong in `INTEGRATION_ORDER`** — caught by the test, but only against
  FKs that actually exist in the schema; add the real FK in the migration so the guard has
  something to check.
- **Mismatched `generate_changelog` signature** (RowOrId vs id-string) vs how you call it —
  compile error, but confusing if you copied from the wrong example.
