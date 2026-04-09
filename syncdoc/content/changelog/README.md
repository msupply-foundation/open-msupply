# Changelog Race Condition

Issue: [#11087](https://github.com/msupply-foundation/open-msupply/issues/11087)
Original fix: [PR #3904](https://github.com/msupply-foundation/open-msupply/pull/3904)

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

## Solutions under consideration

### 1. ACCESS EXCLUSIVE table lock (current approach)

**Status**: Implemented, in production.

Acquire `ACCESS EXCLUSIVE` lock on the changelog table before reading. This waits for all uncommitted writers to finish, then reads a complete, gap-free set of rows.

See: [locking.md](locking.md)

**Pros:**
- Simple, correct, proven
- Single read returns all committed rows
- No application-level state needed

**Cons:**
- Most restrictive lock level — blocks ALL concurrent operations including plain SELECTs
- Writers blocked during reads (even fast ones)
- Could bottleneck under high-throughput sync

### 2. Lower lock levels (SHARE or EXCLUSIVE)

**Status**: Under evaluation. Either could replace ACCESS EXCLUSIVE as a less restrictive alternative.

Same locking strategy, but downgraded to a level that still conflicts with `RowExclusiveLock` (held by writers) while allowing other operations through.

See: [locking.md](locking.md)

- **SHARE** — conflicts with writers, but allows concurrent locked reads. Multiple processors/sync readers can hold the lock simultaneously. Risk: stacking readers extends the window where all writes are blocked (write starvation during busy sync).
- **EXCLUSIVE** — conflicts with writers AND other locked reads, but allows plain SELECTs. Readers are serialized so each write-blocking window is bounded to a single read.

**Pros:**
- Drop-in replacement — same code, just change the lock level string
- I'm pretty sure this is still correct and deterministic - passes tests
- Allows plain SELECTs (e.g. `count()` queries) to proceed unblocked

**Cons:**
- Still a locking strategy — writers blocked during locking reads
- Needs performance testing to confirm no reader starvation under load

### 3. Max safe cursor via postgres

**Status**: Prototype implemented, under evaluation.

The initial idea was to use PostgreSQL internals (like `pg_current_snapshot()` or the `xmin` system column) to directly identify which changelog rows are uncommitted, and compute a safe cursor from that. This doesn't work because under Read Committed isolation, uncommitted rows are simply invisible — you can't query their `xmin` or any other property because you can't see them at all. There is no PostgreSQL mechanism that exposes uncommitted rows to other connections.

The prototype falls back to an indirect approach: query `pg_locks` to detect if any other transaction holds a `RowExclusiveLock` on the changelog table (indicating an in-flight write), then find gaps in the cursor sequence (a missing cursor between `earliest` and the sequence's `last_value` could be an uncommitted row). Readers only read up to `first_gap - 1`. Once all writers finish (no `RowExclusiveLock` held), gaps are assumed to be from rolled-back transactions and skipped over freely.

See: [max_safe_cursor_research.md](max_safe_cursor_research.md)

**Pros:**
- No locking — writers never blocked by readers
- Readers complete immediately (non-blocking)
- Works with current trigger-based inserts (no sync v7 dependency)

**Cons:**
- Gap inference is fundamentally indirect — can't distinguish a rollback gap (permanent, safe to skip) from an in-flight gap (must wait)
- Because of above, rollback gaps + active writers cause over conservative min cursor
- Current `changelogs()` blocks until all writers finish, so a processor that commits a record and immediately re-reads is guaranteed to see it. With this approach the read returns immediately with potentially fewer results, so the processor must retry in a loop instead of relying on a single call (don't think this behaviour is currently depended on)
- Relies on PG internals (pg_locks, sequence inspection) that can change between major versions

### 4. Rust-side in-flight tracker

**Status**: Prototype implemented, passing all tests.

Track in-flight changelog cursors in a process-global `Mutex<BTreeSet<i64>>`. When `ChangelogRepository::insert()` creates a changelog row inside a transaction, the returned cursor is registered in the tracker immediately. When the transaction commits or rolls back (via `transaction_sync_etc`), all its cursors are deregistered. Readers compute `max_safe = min(in_flight) - 1` and only read up to that.

Implementation:
- `ChangelogTracker` (`server/repository/src/db_diesel/changelog/tracker.rs`) — the `BTreeSet<i64>` with register/deregister/max_safe_cursor methods, plus a global singleton via `OnceLock`
- `StorageConnection::track_changelog_cursor()` — called by `insert()`, only registers when inside an explicit transaction (autocommit statements are immediately visible and don't need tracking)
- `StorageConnection::flush_changelog_cursors()` — called after commit and rollback in `transaction_sync_etc`
- Crash safety: on process crash, in-memory tracker state is lost, but all in-flight transactions are rolled back by the database — empty tracker on restart is correct

**Pros:**
- No locking — writers never blocked by readers
- Exact knowledge of in-flight cursors — no gap inference, no heuristics
- Readers complete immediately (non-blocking)

**Cons:**
- Deregister wired to `transaction_sync_etc` — writes outside this path (if any) would not be tracked
- Process-global shared state (but just a `Mutex<BTreeSet<i64>>`)
- Long-running transactions stall cursor advancement (same as locking, but readers return immediately with fewer results instead of blocking)

### 5. Cursor rollback

**Status**: Discussed, not prototyped.

After sync integration, roll processor/sync cursors back to the earliest cursor in the integrated batch. Processors re-scan already-processed entries (which they skip as idempotent).

**Pros:**
- Simple to implement
- No locking or PG internals
- Works across databases

**Cons:**
- Requires all consumers to be idempotent
- Redundant re-syncing of already-sent records
- Doesn't prevent the skip — just recovers from it

## Test coverage

All changelog read modes share the same two test scenarios, run via `ChangelogReadMode` parameterisation:

**Concurrent write test** (`concurrent_write_test`): 3 clinicians inserted, middle one's transaction held open. Verifies all 3 are returned after commit.
- `test_concurrent_write_lock` — ACCESS EXCLUSIVE
- `test_concurrent_write_exclusive_lock` — EXCLUSIVE
- `test_concurrent_write_share_lock` — SHARE
- `test_concurrent_write_safe_cursor_pg` — SafeCursorPostgres (also asserts only 1 row returned while tx is open)
- `test_concurrent_write_safe_cursor_rust` — SafeCursorRust (also asserts only 1 row returned while tx is open)

**Rollback gap test** (`rollback_gap_test`): 3 clinicians inserted, middle one's transaction rolled back. Verifies both visible rows returned despite permanent gap.
- `test_rollback_gap_lock` — ACCESS EXCLUSIVE
- `test_rollback_gap_exclusive_lock` — EXCLUSIVE
- `test_rollback_gap_share_lock` — SHARE
- `test_rollback_gap_safe_cursor_pg` — SafeCursorPostgres
- `test_rollback_gap_safe_cursor_rust` — SafeCursorRust

All tests are Postgres-only (SQLite uses Serializable isolation and can't reproduce the race condition).

**Integration test**: `test_changelog_race_condition_with_processor` in `server/service/src/processors/changelog_race_condition_test.rs` — uses the real AssignRequisitionNumber processor to verify end-to-end correctness.

## Key edge case: "commit then expect processor to see it"

Identified in [#11087](https://github.com/msupply-foundation/open-msupply/issues/11087): a processor that commits an operation and then needs to run again expecting the previous operation to already be processed.

Investigation found this is NOT a problem in practice. The production pattern is fire-and-forget:

```rust
// transaction_sync commits data (changelog entries created)
ctx.processors_trigger.trigger_invoice_transfer_processors(); // fire-and-forget via channel
Ok(invoice)
```

This pattern is used in ~11 places (invoice updates/deletes, requisition updates, synchroniser). None of them await the processor result. `await_events_processed()` exists but is only used in tests.

The processor runs independently on its own loop. By the time it wakes up and reads changelogs, the triggering transaction has already committed and the Rust tracker has deregistered its cursors — so the processor sees the new entries regardless of read mode.

The only scenario where safe cursor returns fewer results is when a **different** long-running transaction is holding an in-flight cursor. In that case:
- Lock approach: processor blocks until that transaction finishes, then sees everything
- Safe cursor approach: processor sees entries up to `min_in_flight - 1`, processes what it can, and catches up on the next cycle after the transaction finishes

Both are correct — safe cursor just delays processing slightly for entries near an unrelated in-flight cursor.

## Files

- [README.md](README.md) — this file (overview)
- [locking.md](locking.md) — lock levels, conflict matrix, and analysis of SHARE vs EXCLUSIVE vs ACCESS EXCLUSIVE
