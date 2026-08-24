---
name: add-synced-table
description: Walk through adding a new table to the open-mSupply server and wiring it into sync. Use when the user wants to "add a new table and make it sync", "make a table sync over v7", "integrate a table that already syncs in v5/v6 but isn't processed yet", or otherwise add/sync a server table. It loads sync-context, then follows the annotated reference guides (repository + migration, changelog, sync-style classification, legacy v5/v6 translation, V7 integration) with worked code, and ends with the verification commands. Trigger whenever a new synced table needs to be added on the server.
argument-hint: "[v7 | v5v6 | <table-name>]"
---

Add a new table to the open-mSupply server and make it sync.

Arguments: $ARGUMENTS (optional — `v7` for a brand-new V7-only table, `v5v6` for a table that already syncs in central mSupply and needs integrating + V7, and/or the table name. If omitted, ask which scenario applies.)

## Step 0: Load sync context first

Run the **`sync-context`** skill (or read its docs) before touching any code. Sync is one of the most consequential surfaces in the repo — bugs corrupt data on real sites. The reference guides below assume that context.

## Step 1: Pick the scenario

There are two cases, and they share most of their work. Decide which applies (ask the user if unclear):

- **A — Brand-new table, V7 sync only.** The table does not exist anywhere yet, and only needs to sync between omSupply sites over V7 (no legacy central mSupply support).
  → Follow [docs/content/docs/sync/adding-a-table/v7-sync/_index.md](../../../docs/content/docs/sync/adding-a-table/v7-sync/_index.md)

- **B — Table already syncs in v5/v6 but isn't integrated yet.** Central mSupply already sends the records over the legacy protocol, but open-mSupply drops them because no translator matches. We add the repo table, the legacy v5/v6 translation, and the V7 bits.
  → Follow [docs/content/docs/sync/adding-a-table/v5-v6-and-v7/_index.md](../../../docs/content/docs/sync/adding-a-table/v5-v6-and-v7/_index.md)

Scenario B is a superset of A (same repository layer + V7 bits) plus the legacy `SyncTranslation`. Both guides use a fictional `widget` table with full code for every file that changes.

## Step 2: Work through the guide

Each guide has a TL;DR checklist table at the top, then a step-per-section walkthrough with the exact file paths and code. The layers, in order:

1. **Repository + migration** — `CREATE TABLE`, the `*_row.rs` row struct + repository + `Upsert`/`Delete` impls, `db_diesel/mod.rs` wiring. Note: **no** `ALTER TYPE changelog_table_name ADD VALUE` — v3 made `changelog.table_name` plain TEXT and dropped that type, so the old call now fails on Postgres. Other PG enums (e.g. `key_type`, for a processor cursor) still need registering.
2. **Changelog** — add the `ChangelogTableName` variant, the `generate_changelog` impl (store-scoped `RowOrId` vs central id-string flavour), the `sync_style.rs` classification (`authoring` / `distribution` / `transport: V5|V6|V5_V6`), and the `Row` enum + `fetch_rows_for_table` arm in `batch_query.rs` (the V7 **push** path).
3. **Legacy v5/v6 translation** *(scenario B only)* — a `SyncTranslation` in `service/src/sync/translations/`, registered in `all_translators()`, with a test-data fixture. Note: `table_name()` must match central exactly; `pull_dependencies()` references the dependency translation's own `table_name()` (e.g. `vec![StoreTranslation.table_name()]`), not a string literal.
4. **V7 sync** — `INTEGRATION_ORDER` (FK order), `serde.rs` `serialize`/`deserialize` arms, and the `translate_delete` arm (if the table supports hard deletes).
5. **Re-sync for existing v7 sites** *(only if v7 sites already exist)* — if the table is new in v7 (or you're turning on v7 coverage for an existing v5/v6 table) and sites are already running v7, their v7 pull cursor was seeded from the v6 position and **will never re-pull the table's historic rows**. Add a migration that seeds a `sync_request` for the table so the `sync_request_runner` backfills it (from cursor 0) on the next tick. Use the shared helpers in `repository/src/migrations/helpers.rs`: guard with `pull_has_started(connection)` (skip fresh installs) then call `seed_sync_request_for_table(connection, ChangelogTableName::Widget)`. Precedent: `repository/src/migrations/v3_00_00/seed_sync_request_user_tables.rs`. The guides cover the full migration file.

Lean on the compiler and the guards: the `Row` enum and the `serde.rs` / `batch_query.rs` matches are non-exhaustive on purpose, so a missing arm is a hard compile error; the `integration_order_is_up_to_date` test catches order/completeness/FK problems.

> The `sync_request` mechanism (auxiliary/special sync, temporary cursor, `reference_id`-scoped buffer isolation) is specified in the **Store re-syncs** and **Re-sync after a v7 migration** sections of `docs/content/docs/sync/v7/_index.md`. Read those before touching auxiliary-sync code.

## Step 3: Verify

From `server/` (always `cargo nextest run`, never `cargo test` — see [AGENT.md](../../../AGENT.md)):

```sh
cd server
cargo nextest run integration_order        # V7 FK order / completeness guard
cargo nextest run sync_v7                   # V7 sync tests
cargo nextest run sync                      # legacy sync suite (scenario B)
cargo build --features postgres             # catches a missing ALTER TYPE / enum arm
```

## Conventions reminder

- Prefer explaining what you'd change and confirming before editing non-trivial sync code, especially anything affecting the changelog row shape, sync-style classification, transport filters, or translator opt-ins.
- After changing `sync_style.rs`, `generate_changelog.rs`, or translator opt-ins, regenerate the plain-English doc via the **`sync-styles-doc`** skill.
