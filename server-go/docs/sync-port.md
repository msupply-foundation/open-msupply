# Go Sync Engine Port — Status & Rollout

The Go sync system (`internal/sync/…`) mirrors the Rust one (`server/service/src/sync/…`):
the translator engine, the write/integration path that inserts & updates synced entities, and
the push path back to central. This document records what is implemented, how to extend it, and
known gaps.

## What is implemented

**Engine (complete, entity-agnostic):**

| Package | Mirrors | Responsibility |
|---|---|---|
| `internal/sync/synctypes` | `translations/mod.rs`, repository enums | `SyncTranslation` interface, `BaseTranslation` defaults, value types (`SyncBufferRow`, `ChangelogRow`), enums (`SyncAction`, `RowAction`, `ChangelogTableName`, transport action), `Upsert`/`Delete` interfaces, `PullTranslateResult`/`PushTranslateResult`, the `ShouldTranslateFrom`/`ShouldTranslateTo` defaults |
| `internal/sync/syncbuffer` | `db_diesel/sync_buffer.rs`, `sync/sync_buffer.rs` | sync_buffer repo: `Insert`, `GetOrdered` (dependency order; reversed for deletes; Central/Remote source filter), `RecordSuccess`/`RecordError` |
| `internal/sync/changelog` | `db_diesel/changelog/changelog.rs` | `LatestCursor`, `Changelogs` (reads `changelog_deduped`), `SetSourceSiteIDAndIsSyncUpdate` |
| `internal/sync/engine` | `translation_and_integration.rs`, `translations/mod.rs` | `PullIntegrationOrder` (Kahn topo sort), `TranslateAndIntegrate` + `IntegrateBuffered` (pull, with per-record **SAVEPOINT** isolation on Postgres / direct on SQLite, app-side changelog cursor stamping), `TranslateChangelogsToSyncRecords` (push) |
| `internal/sync/translations` | `translations/*.rs` | the per-entity translators + `AllTranslators()` registry + shared `util.go` (FK-clear, empty/zero-date helpers) |
| `internal/sync/synctest` | `sync/test/*` | test harness (`IncomingRecord`/`OutgoingRecord`, assertions, DB bootstrap, embedded JSON fixtures, aggregators) |

**Entities (4 of the 6 planned slice entities):**

| Entity | Legacy table | Tier | Tracked | Proves |
|---|---|---|---|---|
| `unit` | `unit` | trivial, no deps | no | baseline upsert, soft delete, untracked path |
| `reason` | `options` | trivial, no deps | no | enum mapping, table-name aliasing |
| `store` | `store` | 1 FK (`name`) | no | FK-dependency ordering, multi-op fan-out (lean row + logo UPDATE), `Ignored` (system stores), hard delete, DB read during translation |
| `stock_line` | `item_line` | multi-dep | **yes** | tracked changelog (app-side cursor), FK-clearing, **push** (translate-to-sync, legacy format, `item_link_id`→`item_id` resolution) |

Together these exercise **every architectural pattern** in the Rust sync system: pull translate +
integrate, push translate-to-sync, tracked/untracked changelog, topological dependency ordering,
multi-operation fan-out, `Ignored`/`NotMatched` results, soft & hard delete, and the
Postgres-savepoint vs SQLite-direct integration split.

**Tests** (`go test ./internal/sync/...`): per-translator unit tests + a cross-DB round-trip
(`TestSyncRoundTrip_{SQLite,Postgres}`) that buffers → integrates → verifies rows → pushes from
the changelog → verifies the outgoing record → pull-deletes. SQLite runs by default; Postgres via
`PG_DSN` (or `scripts/run-postgres-tests.sh`'s throwaway cluster).

## Per-entity rollout recipe (remaining slice + the other ~95 translators)

For each Rust translator in `all_translators()`:

1. **Row repo** — `internal/repository/<name>_row.go`: a row struct (columns from the Rust
   `table!{}` macro **that exist in the Go base schema** — verify against
   `migrations/base_migrations/sqlite_latest.sql`), `UpsertOne` (`INSERT … ON CONFLICT(id) DO
   UPDATE`), `Delete` (hard or soft — match the Rust repo), `FindOneByID`, and `Upsert`/`Delete`
   interface impls. Untracked → return `(0, false, …)`; tracked → call `insertChangelog(...)` and
   return `(cursor, true, …)`.
2. **Translator** — `internal/sync/translations/<name>.go` embedding `synctypes.BaseTranslation`:
   `TableNames`, `PullDependencies`, `ChangelogType` (tracked only), `TryTranslateFromUpsert`/
   `…Delete` (legacy vs OMS/V6 is just *which struct you `json.Unmarshal` into*), and for tracked
   entities `TryTranslateToUpsert`/`…Delete`. Use `clearFK`, `emptyStrAsOption`, `zeroDateAsOption`.
3. **Register** — one line in `AllTranslators()` (the topo sort picks up new `PullDependencies()`).
4. **Fixtures** — copy the Rust `test_data/<name>.rs` JSON verbatim into
   `synctest/testdata/<name>/…` (embed when it contains backticks; otherwise inline) and port the
   expected rows as Go struct literals; add to `synctest/aggregate.go`.
5. **Unit test** — `translations/<name>_test.go` from the established template.

## Immediate next step: `invoice` + `invoice_line`

These follow the recipe; they are the largest translators and were deferred from this slice.

- **`invoice`** (`transact`, tracked): the richest translator
  (`server/service/src/sync/translations/invoice.rs`, ~1000 lines) — legacy type/status mapping,
  `om_*` datetime fields, name_link/clinician/currency resolution, 5 `clear_invalid_fk` calls, and
  a placeholder-user side effect. Port the upsert + push faithfully; the exotic FK-clears may be
  staged as documented TODOs (the engine is proven without them). The `invoice` read repo already
  exists (`internal/repository/invoice.go`) for column-parity reference.
- **`invoice_line`** (`trans_line`, tracked): depends on `invoice` + `stock_line` + `item`
  (`invoice_line.rs`), so it validates a 2-level dependency chain on top of `stock_line`.

## View re-creation (matches Rust)

The Rust server re-creates **all** views on startup, in dependency order, so they never go stale
(`server/repository/src/migrations/views/mod.rs`: `drop_views()` reverse-order, `rebuild_views()`
forward-order, driven by `all_views()`). The Go port now mirrors this in
`internal/migrations/views.go`: `rebuildViews` drops in reverse and recreates in forward order
from an ordered `orderedViews()` list, run after migrations (`runner.go`).

This is necessary because the Go base dumps are inconsistent: `sqlite_latest.sql` bakes in the
stat/ledger views, but **`postgres_latest.sql` contains no views at all**. Recreating on startup
is what gives a fresh Postgres DB its views. `orderedViews()` currently defines the two views the
ported subsystems need — `changelog_deduped` (sync push) and `invoice_view` (repository slice) —
both valid on both dialects; the sync round-trip's push phase now passes on SQLite **and**
Postgres.

## Known gaps / findings

- **The remaining ~28 stat/ledger/report/link views are still absent on Postgres.** They live in
  the SQLite base dump only and are not yet in `orderedViews()` (several reference columns added by
  post-v2.15.0 migrations). Port them into `orderedViews()` the same way as the two above when
  their dependencies are satisfied. (This was the root of the original `changelog_deduped` failure,
  now fixed for the sync path.)
- **Cross-DB seed parity:** Postgres enforces enum columns and NOT-NULL columns that SQLite
  defaults silently (`name.type`, `item.type`, `item.default_pack_size`, `store_mode`). Seeds set
  these explicitly. New fixtures must do the same.
- **Changelog is app-side, not trigger-driven** (no triggers in either base schema). Every tracked
  write repo must call `insertChangelog` itself and return the cursor.
- **Empty string → NULL:** optional string fields use `emptyStrAsOption` / `ptrToNS` to match the
  Rust `empty_str_as_option` serde behaviour (storing `NULL`, not `""`).

## Running

```sh
cd server-go
go test ./internal/sync/...                 # SQLite
./scripts/run-postgres-tests.sh             # or: PG_DSN=… go test ./internal/sync/...
```
