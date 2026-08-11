+++
title = "Integrating a v5/v6 table (+ V7)"
weight = 20
sort_by = "weight"
template = "docs/section.html"
+++

# Integrating a table that already syncs in v5/v6 (and adding V7)

This is the reference walkthrough for the case where:

> The table **already syncs** in central mSupply over the legacy v5/v6 protocol (i.e. central
> already sends the records), but open-mSupply **doesn't process them yet** — the records land
> in the sync buffer and are dropped because no translator matches.

To fully integrate it we need **three things**:

1. **Add the table to the repo** — exactly as in
   [Adding a new table (V7 sync)](../v7-sync/). Migration, row struct, repository,
   changelog enum, `generate_changelog`, `sync_style`, `Row` enum + `fetch_rows_for_table`.
2. **Add the legacy v5/v6 translation** — a `SyncTranslation` that maps the central mSupply
   JSON shape into our repository row (and, if we author the data, back again). *This is the
   part unique to this scenario.*
3. **Add the V7 sync bits** — `INTEGRATION_ORDER`, `serde.rs` serialize/deserialize,
   `translate_delete`. So the same table also syncs between omSupply sites.

We use a fictional table `widget` and assume central mSupply sends a legacy table literally
named `"widget"`. Paths are relative to `server/`.

## v5 vs v6 — what "v5/v6 sync" means here

The two legacy protocols share **one set of translators** (`service/src/sync/translations/`):

| | v5 | v6 |
|---|----|----|
| Central | mSupply Classic (4D) | omSupply central |
| Pull driver | `service/src/sync/central_data_synchroniser.rs` | `central_data_synchroniser_v6.rs` |
| API | `service/src/sync/api/` | `service/src/sync/api_v6/` |

Both push records into the **same `sync_buffer`**, and the **same `all_translators()` list**
processes them. A translator only looks at `SyncBufferRow.table_name` + `.data`; it doesn't
care which protocol carried the record. So "make it sync v5/v6" = **add one translator** to
that shared list. Which protocol actually carries _your_ table is decided by the `transport`
field in `sync_style` (`V5`, `V6`, or `V5_V6`) — see step 1.

## Checklist (TL;DR)

Repo layer (same as the V7-only guide — see it for full code):

| # | File | What you add |
|---|------|--------------|
| R1 | `repository/src/migrations/v3_00_00/add_widget_table.rs` *(new)* + `mod.rs` | `CREATE TABLE` (no changelog enum change — v3 made `changelog.table_name` TEXT) |
| R2 | `repository/src/db_diesel/widget_row.rs` *(new)* + `mod.rs` wiring | row + repository + `Upsert`/`Delete` |
| R3 | `changelog/changelog.rs` | `Widget` in `ChangelogTableName` |
| R4 | `changelog/generate_changelog.rs` | `impl WidgetRow { generate_changelog }` |
| R5 | `changelog/sync_style.rs` | `Widget => SyncStyle { transport: V5 (or V5_V6), .. }` |
| R6 | `changelog/batch_query.rs` | `Row::Widget` + `fetch_rows_for_table` arm |

Legacy v5/v6 translation (the part unique to this scenario):

| # | File | What you add |
|---|------|--------------|
| L1 | `service/src/sync/translations/widget.rs` *(new)* | `LegacyWidgetRow` + `WidgetTranslation` impl + `boxed()` |
| L2 | `service/src/sync/translations/mod.rs` | `pub(crate) mod widget;` + `widget::boxed()` in `all_translators()` |
| L3 | `service/src/sync/test/test_data/widget.rs` *(new)* | upsert/delete fixtures |
| L4 | `service/src/sync/test/test_data/mod.rs` | `pub(crate) mod widget;` + append to the aggregators |

V7 sync bits:

| # | File | What you add |
|---|------|--------------|
| V1 | `repository/src/syncv7/integration_order.rs` | `Widget` in `INTEGRATION_ORDER` (FK order) |
| V2 | `service/src/sync_v7/serde.rs` | `serialize` + `deserialize` arms |
| V3 | `service/src/sync_v7/validate_translate_integrate.rs` | `translate_delete` arm (if deletable) |
| V4 | `repository/src/migrations/v3_00_00/seed_sync_request_<table>.rs` *(new — only if v7 sites already exist)* | seed a `sync_request` so already-migrated sites re-pull historic rows |

---

## Part 1 — Add the table to the repo

Identical to steps 1–4 of [Adding a new table (V7 sync)](../v7-sync/): migration,
`widget_row.rs`, `mod.rs` wiring, `ChangelogTableName::Widget`, `generate_changelog`,
`sync_style`, and the `Row` enum + `fetch_rows_for_table`. Don't repeat it here — go do that
first, then come back.

**One difference: `sync_style.transport`.** Because the table genuinely travels over legacy
sync, set the transport to match how central sends it:

```rust
Widget => SyncStyle {
    authoring: vec![Central],     // central authors it, remotes only read
    distribution: vec![D::Central],
    transport: V5,                // or V6, or V5_V6 — match central's behaviour
},
```

For central-authored reference data (the typical "already syncs in v5/v6 but unprocessed"
case) this `Central` / `Central` / `V5` shape mirrors `Currency`, `Item`, `LocationType`.

---

## Part 2 — The legacy v5/v6 translation

This is what makes the buffered central records actually integrate. A legacy translation is a
struct implementing `SyncTranslation`, registered in `all_translators()`.

### L1. The translation file

`service/src/sync/translations/widget.rs` *(new file)*

```rust
use repository::{StorageConnection, SyncBufferRow, WidgetRow, WidgetRowDelete};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};
// Import each dependency's translation struct so `pull_dependencies()` can
// reference its `table_name()` (see below). Only needed if you have FK parents.
// use crate::sync::translations::store::StoreTranslation;

// The shape central mSupply sends. Field names mirror the legacy table exactly;
// `#[serde(rename = ...)]` bridges legacy names → our struct field names.
#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyWidgetRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub name: String,
    // Central may send a different key than our column name:
    #[serde(rename = "store_ID")]
    pub store_id: Option<String>,
}

pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(WidgetTranslation)
}

pub(super) struct WidgetTranslation;

impl SyncTranslation for WidgetTranslation {
    // The legacy table name EXACTLY as central sends it (case-sensitive!).
    // If this doesn't match, records are silently ignored.
    fn table_name(&self) -> &str {
        "widget"
    }

    // Tables that must integrate before this one, so FK parents exist.
    // Used for the legacy topological sort. Reference the dependency's OWN
    // translation `table_name()` rather than a string literal — semantically
    // this declares "depends on the Store translator", and it stays correct
    // if Store's legacy table name ever changes.
    fn pull_dependencies(&self) -> Vec<&str> {
        vec![] // e.g. vec![StoreTranslation.table_name()] if widget.store_id references store
    }

    // PULL: central JSON -> our repository row.
    fn try_translate_from_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // `SyncBufferRow::deserialize()` is the standard helper — it deserializes
        // `sync_record.data` (a `SyncRecordData`, not a raw string) into the legacy struct.
        let LegacyWidgetRow { id, name, store_id } = sync_record.deserialize()?;

        let result = WidgetRow {
            id,
            name,
            store_id,
            created_datetime: chrono::Utc::now().naive_utc(),
        };

        Ok(PullTranslateResult::upsert(result))
    }

    // PULL: central delete -> our row delete.
    fn try_translate_from_delete_sync_record(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(WidgetRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    // change_log_type() is NOT overridden -> defaults to None -> PULL-ONLY.
    // Central authors widgets; this site never pushes them back over legacy.
}

#[cfg(test)]
mod tests {
    use crate::sync::test::test_data::widget as test_data;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_widget_translation() {
        let translator = super::WidgetTranslation {};
        let (_, connection, _, _) =
            setup_all("test_widget_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();
            assert_eq!(result, record.translated_record);
        }
        for record in test_data::test_pull_delete_records() {
            let result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();
            assert_eq!(result, record.translated_record);
        }
    }
}
```

Key points:

- **`table_name()` must match central exactly**, including capitalisation. Central tables are
  often capitalised oddly (e.g. `"Location_type"`, or `"item_line"` for what we call
  `stock_line`). Get this from the legacy schema / an actual sync buffer dump — a mismatch
  means the record is silently dropped, with no error.
- **Pull-only is the default.** Not overriding `change_log_type()` returns `None`, which means
  the translation is never invoked on push — correct for central-authored reference data. If
  this site _does_ author the data and must push it back to central, return
  `Some(ChangelogTableName::Widget)` and implement `try_translate_to_upsert_sync_record`
  (and `..._delete`). See `name.rs` / `campaign.rs` for examples.
- **`pull_dependencies()`** declares the FK-parent tables that must integrate first, by
  calling the **dependency translation's own `table_name()`** — e.g.
  `vec![StoreTranslation.table_name()]`, not `vec!["store"]`. The two are logically equal but
  semantically different: you're declaring a dependency on *that translator*, and it stays
  correct if the dependency's legacy table name ever changes. (Import the struct via
  `use crate::sync::translations::store::StoreTranslation;`.) The legacy integration order is
  a topological sort over these; a cycle panics at startup.

### L2. Register the translation

`service/src/sync/translations/mod.rs`:

```rust
pub(crate) mod widget; // alphabetical with the other `pub(crate) mod`

pub(crate) fn all_translators() -> SyncTranslators {
    vec![
        // ...
        widget::boxed(), // place near its dependencies; exact slot is sorted by pull_dependencies()
        // ...
    ]
}
```

### L3 & L4. Translation tests

`service/src/sync/test/test_data/widget.rs` *(new file)*

```rust
use crate::sync::test::TestSyncIncomingRecord;
use repository::{WidgetRow, WidgetRowDelete};

const TABLE_NAME: &str = "widget";

// (record_id, legacy JSON exactly as central sends it)
const WIDGET_1: (&str, &str) = (
    "widget_a",
    r#"{
        "ID": "widget_a",
        "name": "Test widget",
        "store_ID": "store_a"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        WIDGET_1,
        WidgetRow {
            id: "widget_a".to_string(),
            name: "Test widget".to_string(),
            store_id: Some("store_a".to_string()),
            // NB: if your translation derives created_datetime from "now",
            // the test must account for it (e.g. assert on the fields you map,
            // or have the translation take the datetime from the legacy data).
            ..Default::default()
        },
    )]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        WIDGET_1.0,
        WidgetRowDelete(WIDGET_1.0.to_string()),
    )]
}
```

Register it in `service/src/sync/test/test_data/mod.rs`:

```rust
pub(crate) mod widget; // alphabetical

// add to the central pull aggregator(s):
pub(crate) fn get_all_pull_upsert_central_test_records() -> Vec<TestSyncIncomingRecord> {
    let mut test_records = Vec::new();
    // ...
    test_records.append(&mut widget::test_pull_upsert_records());
    // ...
}
```

> **Tip on `created_datetime`.** The example translation invents `created_datetime` with
> `Utc::now()`, which is awkward to assert in a test. If central sends a timestamp, map it
> through (`#[serde(...)]`) so the round-trip is deterministic; otherwise assert only on the
> mapped fields. Prefer mapping real data over inventing it.

---

## Part 3 — Add the V7 sync bits

So the same table also syncs omSupply↔omSupply over V7. These are steps 5–7 of the
[V7 guide](../v7-sync/), summarised:

### V1. Integration order

`repository/src/syncv7/integration_order.rs` — add `ChangelogTableName::Widget` in FK order
(after any parents such as `Store`). The `integration_order_is_up_to_date` test enforces it.

### V2. `serde.rs`

`service/src/sync_v7/serde.rs`:

```rust
// serialize (push): Row -> JSON
Row::Widget(r) => serde_json::to_value(r).map_err(map_serde_err),

// deserialize (pull): JSON -> Box<dyn Upsert>
ChangelogTableName::Widget => from_value::<WidgetRow>(data),
```

> The V7 `deserialize` uses our **own** `WidgetRow` JSON shape (serde of the repository
> struct), **not** the `LegacyWidgetRow` shape. The legacy translation (Part 2) is the only
> place the central JSON shape is parsed. Keep the two straight: legacy translation = central's
> JSON; V7 = our row's JSON.

### V3. Delete translation

`service/src/sync_v7/validate_translate_integrate.rs` → `translate_delete()`:

```rust
ChangelogTableName::Widget => Box::new(WidgetRowDelete(id)),
```

(Skip if the table is soft-delete only.)

### V4. Re-sync for sites already on V7 (`sync_request` migration)

**Only if V7 sites already exist.** This case is especially likely to need it: the table was
already flowing over v5/v6, and you're switching on V7 coverage *now* — so on a site that
migrated to V7 before this change, the table's historic rows sit behind the seeded V7 cursor
and a normal V7 pull will never re-pull them.

Seed a `sync_request` for the table in a migration so the `sync_request_runner` backfills
those rows (filtered to the table, from cursor 0) on the next tick, using the shared helpers
in `repository/src/migrations/helpers.rs`:

```rust
fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
    if !pull_has_started(connection)? {
        return Ok(()); // fresh install — initial sync covers everything
    }
    seed_sync_request_for_table(connection, ChangelogTableName::Widget)?;
    Ok(())
}
```

This is identical to [Step 8 of the V7-only guide](../v7-sync/) — see it for the
full migration file and imports. The precedent is
`repository/src/migrations/v3_00_00/seed_sync_request_user_tables.rs`.

---

## Why both legacy and V7?

A site can be talking to a legacy central (v5/v6) **and** participate in V7 sync with other
omSupply sites. The two paths converge on the same repository row and the same `changelog`:

```
central mSupply ──v5/v6──▶ sync_buffer ──(legacy SyncTranslation)──┐
                                                                   ├──▶ WidgetRow + changelog
omSupply site   ──v7─────▶ sync_buffer ──(serde.rs deserialize)────┘
```

Because both write the same changelog (classified by `sync_style`), push works uniformly:
the changelog cursor query loads the `Row::Widget` (Part 1, `batch_query.rs`) and `serialize`
turns it into the V7 wire shape. That's why **all three parts are needed** even though the
data is "the same table".

---

## Verifying

```sh
cd server
cargo nextest run test_widget_translation   # the legacy translation test
cargo nextest run integration_order          # V7 FK order / completeness
cargo nextest run sync                        # broader legacy sync suite
cargo build --features postgres               # missing enum arms
cargo nextest run --features postgres migration_3_00_00   # migrations actually run on PG
```

## Common mistakes (in addition to the V7 guide's list)

- **`table_name()` mismatch with central** — the single most common cause of "records arrive
  but nothing happens". It's silent. Verify against a real sync buffer dump.
- **Parsing the wrong JSON shape** — legacy translation parses `LegacyWidgetRow` (central's
  keys); V7 `deserialize` parses `WidgetRow` (our keys). Don't cross them.
- **Forgetting to register in `all_translators()` or the test aggregator** — the file compiles
  but the translation never runs / the test never executes.
- **Assuming pull-only** when the site actually authors the data — then changes never reach
  central. Decide deliberately whether `change_log_type()` should return `Some(..)`.
