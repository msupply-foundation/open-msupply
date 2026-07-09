# Changelog Race Condition

Issue: [#11087](https://github.com/msupply-foundation/open-msupply/issues/11087)
Original fix in `develop`: [PR #3904](https://github.com/msupply-foundation/open-msupply/pull/3904) (table-level lock)

## The problem

PostgreSQL uses Read Committed isolation by default. Sequence values (used for `changelog.cursor`) are allocated outside the transaction, but the row is only visible after commit. This allows a reader to see a non-contiguous set of cursors and advance past a gap that an uncommitted transaction will later fill.

```
Tx A: INSERT → cursor=1, COMMIT        ✓ visible
Tx B: INSERT → cursor=2, still open    ✗ invisible
Tx C: INSERT → cursor=3, COMMIT        ✓ visible

Reader sees: [1, 3] → advances cursor to 4
Tx B commits: cursor=2 now visible, but reader has moved past it → SKIPPED
```

This affects all cursor-based changelog consumers: processors (e.g. AssignRequisitionNumber), sync pull (remote sites pulling from central), and transfer processors.

SQLite is not affected — it uses Serializable isolation and cannot have concurrent writers.

## Solutions explored

The investigation happened on a research branch (`11087-research-changelog-record-locking`) that prototyped five approaches. The branch may not stick around — full diffs for each prototype are preserved under [diffs/](diffs/) so they can be referenced later.

### 1. ACCESS EXCLUSIVE table lock — original fix on `develop`

**Status**: Lives on `develop`, never merged into `feature-sync`.

Acquire `ACCESS EXCLUSIVE` lock on the changelog table before reading. Waits for all uncommitted writers to finish, then reads a complete, gap-free set of rows.

See [locking.md](locking.md) for the lock-level analysis and conflict matrix.

**Pros:**
- Simple, correct, proven.
- Single read returns all committed rows.
- No application-level state needed.

**Cons:**
- Most restrictive lock level — blocks ALL concurrent operations including plain SELECTs.
- Writers blocked during reads (even fast ones).
- Could bottleneck under high-throughput sync.

### 2. Lower lock levels (SHARE or EXCLUSIVE)

**Status**: Evaluated, not chosen.

Same locking strategy, but downgraded to a level that still conflicts with `RowExclusiveLock` (held by writers) while allowing other operations through. See [locking.md](locking.md).

- **SHARE** — conflicts with writers, allows concurrent locked reads. Risk: stacking readers extends the window where writes are blocked.
- **EXCLUSIVE** — conflicts with writers AND other locked reads, allows plain SELECTs. Readers serialised.

### 3. Max safe cursor via Postgres internals

**Status**: Prototype only — not adopted.

The initial idea was to use PG internals (`pg_current_snapshot()`, `xmin`) to identify uncommitted rows. Doesn't work — under Read Committed, uncommitted rows are simply invisible, you can't query their `xmin` because you can't see them at all.

The prototype falls back to an indirect approach: query `pg_locks` for `RowExclusiveLock` on the changelog table (indicating an in-flight writer), find gaps in the cursor sequence, and only read up to `first_gap - 1`.

Diff: [diffs/prototype_safe_cursor_postgres.patch](diffs/prototype_safe_cursor_postgres.patch).

**Cons that ruled it out:**
- Gap inference is indirect — can't distinguish a rollback gap (permanent, safe to skip) from an in-flight gap (must wait).
- Rollback gaps + active writers cause an over-conservative min cursor.
- Relies on PG internals (`pg_locks`, sequence inspection) that can change between major versions.

### 4. Rust-side in-flight tracker — chosen approach

**Status**: Adopted into `feature-sync`. See implementation in:
- [server/repository/src/db_diesel/changelog/changelog_cursor_tracker.rs](../../../../server/repository/src/db_diesel/changelog/changelog_cursor_tracker.rs)
- [server/repository/src/db_diesel/storage_connection.rs](../../../../server/repository/src/db_diesel/storage_connection.rs) (manager-owned `Arc<ChangelogCursorTracker>`, per-connection `Uuid`, untrack on outermost commit/rollback)
- [server/repository/src/db_diesel/changelog/changelog.rs](../../../../server/repository/src/db_diesel/changelog/changelog.rs) (`insert`/`batch_insert` call `track`; `query` and `max_cursor` clamp by `max_safe_cursor`)

**How it works.** A process-owned (manager-owned) `Mutex<HashMap<Uuid, i64>>` tracks an in-flight boundary per connection per transaction. On the first changelog insert of a tx, the connection registers `(uuid, MAX(cursor) + 1)` — a lower bound on the cursors the tx will produce. Subsequent inserts in the same tx are no-ops (uuid already a key). On outermost commit/rollback the entry is removed. Readers compute `max_safe = min(values) - 1` and clamp `query()` and `max_cursor()` to it.

Original prototype (used a process-global `OnceLock`, a `BTreeSet<i64>`, and registered the actual returned cursor via `INSERT … RETURNING`): [diffs/prototype_safe_cursor_rust.patch](diffs/prototype_safe_cursor_rust.patch).

Differences from the prototype as adapted into `feature-sync`:
- Tracker lives on `StorageConnectionManager` (Arc), not a global `OnceLock`. Cleaner ownership, isolates tests.
- Map keyed by per-connection `Uuid` instead of cursor numbers. Idempotency comes from the uuid's presence in the map; no separate bool.
- One entry per connection per tx — registered at first insert with `MAX(cursor) + 1` as a lower bound. The prototype registered every actual cursor via `INSERT … RETURNING`.
- Untrack only on the **outermost** commit/rollback (matches the existing `flush_notifications` pattern). The prototype flushed on every level; that would deregister cursors before their outer tx is visible.
- `max_cursor()` short-circuits when the tracker has an entry — returns `safe` directly without a DB round-trip.

**Pros:**
- No locking — writers never blocked by readers.
- Exact knowledge of in-flight cursors — no gap inference, no heuristics.
- Readers complete immediately (non-blocking).

**Cons:**
- Long-running transactions stall cursor advancement (same as locking, but readers return immediately with fewer results instead of blocking).
- Untrack wired to `transaction_sync_etc` — writes outside this path (if any) would not be deregistered.

### 5. Cursor rollback

**Status**: Discussed, not prototyped.

After sync integration, roll processor/sync cursors back to the earliest cursor in the integrated batch. Processors re-scan already-processed entries (idempotent skip).

**Cons that ruled it out:**
- Requires all consumers to be idempotent.
- Redundant re-syncing of already-sent records.
- Doesn't prevent the skip — just recovers from it.

## Test coverage in feature-sync

- Tracker unit tests in [server/repository/src/db_diesel/changelog/changelog_cursor_tracker.rs](../../../../server/repository/src/db_diesel/changelog/changelog_cursor_tracker.rs) (`#[cfg(test)] mod tests`): empty, idempotent, untrack-on-commit, untrack-on-rollback, autocommit no-op, two-connection min — pass on both SQLite and Postgres.
- Postgres-only integration test `test_max_cursor_clamped_by_in_flight_tx` in [server/repository/src/db_diesel/changelog/test.rs](../../../../server/repository/src/db_diesel/changelog/test.rs): opens a slow tx on connection A from a shared manager, asserts `max_cursor()` and `query()` on a separate observer connection are clamped while the tx is in flight, then asserts visibility recovers after commit.

The prototype branch additionally had a parameterised `concurrent_write_test` / `rollback_gap_test` (across `ChangelogReadMode::{AccessExclusiveLock, ExclusiveLock, ShareLock, SafeCursorPostgres, SafeCursorRust}`) and an end-to-end processor-driven integration test (`test_changelog_race_condition_with_processor` using `AssignRequisitionNumber`). Neither was brought across — the mode enum was specific to the prototype, and the processor test wasn't needed once the targeted `max_cursor` clamp test was in place. Diffs preserved at [diffs/prototype_race_condition_test.patch](diffs/prototype_race_condition_test.patch).

## Key edge case: "commit then expect processor to see it"

A processor that commits an operation and then expects the next processor cycle to see it. Investigation on the research branch found this is **not** a problem in practice — the production pattern is fire-and-forget:

```rust
// transaction_sync commits data (changelog entries created)
ctx.processors_trigger.trigger_invoice_transfer_processors(); // fire-and-forget via channel
Ok(invoice)
```

This pattern is used in ~11 places (invoice updates/deletes, requisition updates, synchroniser). None await the processor result. `await_events_processed()` exists but is only used in tests.

By the time the processor wakes up and reads changelogs, the triggering tx has already committed and its tracker entry is gone — so the processor sees the new entries regardless of read mode.

The only scenario where the safe-cursor approach returns fewer results is when a **different** long-running tx is holding an in-flight cursor. In that case:

- Lock approach: processor blocks until that tx finishes, then sees everything.
- Safe-cursor approach: processor sees entries up to `min_in_flight - 1`, processes what it can, catches up on the next cycle.

Both are correct — safe cursor just delays processing slightly for entries near an unrelated in-flight cursor.

## Files

- [README.md](README.md) — this file.
- [locking.md](locking.md) — lock-level analysis (SHARE vs EXCLUSIVE vs ACCESS EXCLUSIVE), describes the lock-based approach used on `develop`.
- [diffs/](diffs/) — git-format patches for prototypes that aren't in any merged branch:
  - `prototype_initial_research_doc.patch` — first revision of these docs.
  - `prototype_remove_old_doc.patch` — removed an early `current_lock_approach.md`.
  - `prototype_race_condition_test.patch` — processor-driven race-condition integration test.
  - `prototype_safe_cursor_postgres.patch` — `pg_locks` + gap-detection PG approach.
  - `prototype_safe_cursor_rust.patch` — original Rust tracker prototype (process-global `OnceLock`, `BTreeSet<i64>`, `INSERT … RETURNING`).
