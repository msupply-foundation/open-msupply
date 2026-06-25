# Design: consolidate v5/v6 and v7 sync-buffer integration

Status: **proposal (not yet built)**
Driver: **correctness parity** — both sync versions should run through one orchestration
engine so a hard-won fix (savepoint discipline, dedup, chunking, changelog/buffer isolation)
can never land in one path and be forgotten in the other.

This resolves the long-standing `// Todo, can we combine with SyncBufferIntegrator?` in
`sync_v7/validate_translate_integrate.rs`.

## Where we are today

Two near-identical orchestration loops with three genuine differences.

| Stage | v5/v6 (`sync/translation_and_integration.rs`) | v7 (`sync_v7/validate_translate_integrate.rs`) |
|---|---|---|
| Outer tx | `transaction_sync` (synchroniser, `use_transaction`) | `transaction_sync` (`validate_translate_integrate`) |
| Fetch | `process_action` loops `table_order` × action, 10k batches | `validate_translate_integrate_inner`, same shape |
| **Table order** | `pull_integration_order(translators)` — topological sort of `pull_dependencies()` | `INTEGRATION_ORDER` const (FK-verified by test) |
| **Translate** | `SyncTranslation` trait: legacy 4D/mSupply format, `FkChecker`, merges, link tables, documents | `deserialize` = serde `from_value` into a `Row` (already OMS shape) |
| Validate | inside translators | `validate_on_central` / `validate_on_remote` per `SyncContext` |
| **Changelog** | derived from the integrated `Row` (`generate_changelog` after upsert; `generate_delete_changelog` BEFORE delete) | built from the buffer row (`create_changelog`), inserted after |
| Batch integrate | `integrate_batch` → `batch_operations` | `integrate_in_batch` → `batch_operations` |
| Dedup | `(table, record_id)` | `record_id` |
| Buffer result | `set_batch_integration_result` | `set_batch_integration_result` |
| Savepoint discipline | `wrap_in_tx` (pg); changelog/buffer write `reuse=false` | `wrap_record_in_tx`; same |

### Irreducible differences (cannot merge)
1. **Translation layer.** Legacy trait dispatch + FK checking (v5/v6) vs serde `from_value`
   (v7). This is the entire reason two paths exist (legacy 4D format vs OMS-native).
2. **Changelog source.** Derived-from-row, delete-changelog-before-delete (v5/v6) vs
   built-from-buffer, written-after (v7).
3. **Table order source.** Topological from translators (v5/v6) vs hand-maintained const (v7).

### Already identical (the consolidation target)
Outer-tx setup, per-table×action 10k fetch loop, the `batch_operations` call + per-op result
attribution, `(table, record_id)` dedup, the savepoint-isolated changelog write
(`reuse=false`) + batched buffer-result write, progress logging.

## Proposed shape

Keep **one** `SyncBufferIntegrator` engine. Inject the per-version behaviour through a
**translation closure** that returns, per op, a **changelog policy** enum. The engine owns all
the orchestration we have already hardened.

### Injected types

```rust
/// What the version-specific translator produced for one sync_buffer row.
pub(crate) enum TranslatedOutcome {
    Operations(Vec<IntegratableOp>),
    Ignored(String),   // v5/v6 `Ignored` -> buffer result Ignored (not a hard error)
    NoTranslator,      // v5/v6 "Translator for record not found" -> Error (not a hard error)
}

pub(crate) struct IntegratableOp {
    pub operation: BatchOperation,   // Upsert(Row) | Delete { table, record_id }
    pub priority: i32,               // pre-upsert-delete bump for v5/v6; v7 always 1
    pub changelog: ChangelogPolicy,
}

/// The two changelog regimes, unified.
pub(crate) enum ChangelogPolicy {
    /// v7: changelog already built from the buffer row; insert after the op succeeds.
    Prebuilt(ChangeLogInsertRow),
    /// v5/v6 upsert: generate from the integrated Row AFTER the upsert succeeds.
    FromRowAfterUpsert,
    /// v5/v6 delete: generate from the still-present row BEFORE the delete (engine calls
    /// `generate_delete_changelog` inside the op's savepoint, before batch_operations runs).
    FromRowBeforeDelete,
    /// No changelog (documents self-manage; some non-sync rows).
    None,
}
```

### Engine

```rust
struct SyncBufferIntegrator<'a, T>
where T: Fn(&StorageConnection, &SyncBufferRow, &SyncContext) -> TranslatedOutcome
{
    connection: &'a StorageConnection,
    table_order: &'a [&'a str],
    source_site_id: i32,
    sync_version: SyncVersion,
    reference_id: Option<&'a str>,
    translate: T,
    // progress: total_pending, done_so_far, total_errored, last_progress_time
}
```

The engine method body is exactly today's hardened v5/v6 flow, generalised:

1. Loop `table_order` × `SyncAction`, fetch 10k pending rows (`pending_ordered_by_cursor`,
   ASC for upserts / DESC for deletes — preserves per-table ordering: the next table is not
   touched until the current table's batch is fully integrated).
2. Per row: `(self.translate)(con, &row, ctx)` -> `TranslatedOutcome`.
   - `Ignored` / `NoTranslator` -> record outcome, continue.
   - `Operations(ops)` -> for each `IntegratableOp`:
     - if `changelog == FromRowBeforeDelete`: generate the delete changelog now in its own
       savepoint (`transaction_sync_etc(.., reuse=false)`), stash it.
     - push `BatchDbOperation { priority, operation, extra: (cursor, ChangelogPolicy),
       dedup_key: (table, record_id) }`.
3. `batch_operations(con, input, wrap_in_tx)` — savepoint-isolated per chunk/op.
4. Post-batch, per result:
   - error -> mark all the group's cursors errored.
   - success -> resolve changelog by policy: `Prebuilt(c)` use `c`; `FromRowAfterUpsert` ->
     `row.generate_changelog(...)` in a savepoint; `FromRowBeforeDelete` -> already stashed;
     `None` -> nothing.
5. `transaction_sync_etc(reuse=false)` { `ChangelogRepository::batch_insert(changelogs)` +
   `set_batch_integration_result(buffer_updates)` } — consistency + isolation.
6. Per-cursor `RecordOutcome` -> buffer result + result tally.

### Adapters (thin)

**v5/v6 closure** wraps `translate_sync_record` (the `SyncTranslation` trait + `FkChecker`):
- `PullTranslateResult::Ignored(msg)` -> `TranslatedOutcome::Ignored(msg)`
- no translator matched -> `TranslatedOutcome::NoTranslator`
- `IntegrationOperations(ops)`:
  - `Upsert(Row)` -> `IntegratableOp { Upsert, FromRowAfterUpsert, priority }`
  - `Delete` -> `IntegratableOp { Delete, FromRowBeforeDelete, priority }`, with the
    pre-upsert-delete priority bump (a `Delete` before any `Upsert` in the same record's op
    list gets the higher priority).
  - **`UpsertNonSync` / `UpsertDocument`** — these are NOT batchable. **Per the decision, the
    v5/v6 closure writes them itself, savepoint-isolated, and returns only the batchable ops to
    the engine.** The engine therefore only ever sees `Upsert(Row)` / `Delete` and stays
    v7-shaped. (Their failure is recorded against the record's outcome by the closure; the
    closure needs a way to report that back — see Open Questions.)

**v7 closure** wraps `deserialize` + `validate_on_central`/`validate_on_remote`:
- validation error / unknown table / unsupported action -> map to an error outcome
- every op -> `IntegratableOp { op, Prebuilt(create_changelog(...)), priority: 1 }`

`table_order`: v5/v6 passes `pull_integration_order(translators)`, v7 passes
`INTEGRATION_ORDER`. Engine takes a uniform `&[&str]`.

## What this buys

- One owner for savepoint discipline, `(table,record_id)` dedup, chunking, `reuse=false`
  changelog/buffer write, buffer-result batching, progress. Fixes apply to both versions.
- Deletes the duplicated loops: `integrate_batch` + `RecordOutcome` (v5/v6) and
  `integrate_in_batch` + `integrate_sync_buffer_batch` + `write_changelogs_and_sync_buffer`
  (v7).

## Migration (incremental; each step compiles + PG tests green)

1. Add `TranslatedOutcome` / `IntegratableOp` / `ChangelogPolicy` + the generic engine
   alongside existing code (no callers).
2. Port **v5/v6** to the engine; delete its old `integrate_batch` / `RecordOutcome`. Run PG
   sync tests (`test_batch_translate_and_integrate`, `test_batch_dedups_same_record_across_cursors`).
3. Port **v7** to the engine; delete `integrate_in_batch` / `integrate_sync_buffer_batch` /
   `write_changelogs_and_sync_buffer`. Run PG v7 tests.
4. Remove dead code; update the `// Todo, can we combine` comment site.

## Open questions to resolve before building

1. **How does the v5/v6 closure report a non-batchable write failure (UpsertNonSync /
   UpsertDocument) back to the engine's per-record outcome?** Options: the closure returns an
   extra "already-errored cursors" set; or `TranslatedOutcome` gains an `Errored(String)`
   variant the closure can emit after a failed self-write; or the closure takes
   `&mut RecordOutcome`-like sink. Leaning: give `TranslatedOutcome` an explicit error
   variant so the closure stays self-contained.

2. **Closure vs trait.** A generic `Fn` closure is simplest but makes the engine generic
   (`SyncBufferIntegrator<'a, T>`), which ripples into the caller types. A `dyn` trait object
   (`&dyn IntegrationStrategy`) avoids the generic at a tiny vtable cost and may read cleaner
   given the closure also needs `table_order` + `sync_version`. Leaning: a small
   `trait IntegrationStrategy { fn sync_version(); fn table_order(); fn translate(...); }`
   over a bare closure, since there are several injected bits, not just one.

3. **`SyncContext`.** v7 has a rich `SyncContext` (Central / Remote / PatientLookup) driving
   validation; v5/v6 has none (validation lives in translators). The engine should treat the
   context as an associated type / generic on the strategy, or pass `()` for v5/v6.

4. **Merge action.** v5/v6 supports `SyncAction::Merge` (special merge translators); v7
   returns `UnsupportedAction`. The engine loop already iterates all three actions; the
   strategy decides what `Merge` produces. Confirm v5/v6 merge still flows correctly through
   the unified loop.

5. **Progress + error counting parity.** v5/v6 counts translation errors as hard errors but
   not Ignored/NoTranslator; v7 has its own counting. Confirm the unified `RecordOutcome`
   tally matches each version's current semantics (important for the sync status UI).
