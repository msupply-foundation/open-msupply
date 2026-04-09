# Changelog Locking

## How it works

The three changelog read methods (`changelogs()`, `outgoing_sync_records_from_central()`, `outgoing_patient_sync_records_from_central()`) use cursor-based progression and call `with_locked_changelog_table()`, which acquires a table-level lock before reading:

```sql
LOCK TABLE ONLY changelog IN ACCESS EXCLUSIVE MODE
```

This lock:
- **Waits** for any uncommitted writers to finish (ACCESS EXCLUSIVE conflicts with all other lock types)
- **Blocks** all other operations on the table while the read is in progress

The lock is held only for the duration of the read query, not during processing. The flow is:

1. Acquire lock (blocks until all writers commit)
2. Read changelog batch
3. Release lock (end of transaction)
4. Process records
5. Update cursor

## PostgreSQL lock conflict matrix

Changelog writers hold `ROW EXCLUSIVE` (acquired automatically by INSERT/UPDATE/DELETE). To prevent the race condition, our read lock must conflict with `ROW EXCLUSIVE`. The minimum level that does so is `SHARE`.

| Requested Lock | ACCESS SHARE | ROW SHARE | ROW EXCL. | SHARE UPDATE EXCL. | SHARE | SHARE ROW EXCL. | EXCL. | ACCESS EXCL. |
|---|---|---|---|---|---|---|---|---|
| ACCESS SHARE | | | | | | | | X |
| ROW SHARE | | | | | | | X | X |
| ROW EXCL. | | | | | X | X | X | X |
| SHARE UPDATE EXCL. | | | | X | X | X | X | X |
| **SHARE** | | | **X** | X | | X | X | X |
| SHARE ROW EXCL. | | | X | X | X | X | X | X |
| **EXCLUSIVE** | | X | **X** | X | X | X | X | X |
| **ACCESS EXCL.** | X | X | **X** | X | X | X | X | X |

X = conflict (requesting lock will wait for existing lock to be released).

Source: [PostgreSQL explicit locking documentation](https://www.postgresql.org/docs/current/explicit-locking.html)

The bold rows are the candidate lock levels for our changelog reads. All three conflict with `ROW EXCL.` (the writer lock), which is the minimum requirement.

## Why the lock level matters

The race condition is between **writers** (INSERT via triggers) and **readers** (processors/sync pulling changelogs). Our read lock must conflict with the writer's `ROW EXCLUSIVE` lock. But choosing a level that's MORE restrictive than necessary blocks operations that aren't part of the race condition.

### SHARE

Multiple changelog readers can hold SHARE simultaneously. While individually correct, stacking readers extends the window during which all changelog writes are blocked. This could cause write starvation during busy sync periods (e.g. multiple sites pulling concurrently while another site is pushing). This needs performance testing to confirm.

### EXCLUSIVE

Multiple locked reads will not happen in parallel but serializes changelog reads so each write-blocking window is bounded to a single read operation. Plain SELECTs (e.g. `count()` queries, monitoring) proceed unblocked. This prevents reader stacking while not blocking read-only operations.

### ACCESS EXCLUSIVE (current)

This is what we currently use. It additionally blocks plain SELECTs, which is more restrictive than necessary — the race condition only involves writers, not readers. Could be downgraded to EXCLUSIVE with no correctness impact.

## Code paths

The lock is implemented in `with_locked_changelog_table()` (`server/repository/src/db_diesel/changelog/changelog.rs`). Three repository methods use it:

### `changelogs()` — processors and sync push

All general processors and transfer processors read changelogs through this method:

- **General processors** (`server/service/src/processors/general_processor.rs:125`) — AssignRequisitionNumber, ContactFormEmail, LoadPlugin, etc.
- **Transfer processors**:
  - Invoice transfers (`server/service/src/processors/transfer/invoice/mod.rs:174`)
  - Requisition transfers (`server/service/src/processors/transfer/requisition/mod.rs:132`)
- **Sync push to central** (`server/service/src/sync/remote_data_synchroniser.rs:200`)
- **Sync push from central** (`server/service/src/sync/central_data_synchroniser_v6.rs:150`)

### `outgoing_sync_records_from_central()` — v6 sync pull

Called when a remote site pulls records from central:

- `server/service/src/sync/sync_on_central/mod.rs:80`

### `outgoing_patient_sync_records_from_central()` — patient sync pull

Called when a remote site pulls patient-specific records from central:

- `server/service/src/sync/sync_on_central/mod.rs:233`

### Methods NOT protected by the lock

`count()` and `count_outgoing_sync_records_from_central()` do **not** use the lock, because they don't advance a cursor and therefore aren't susceptible to the race condition. These use plain SELECTs and would benefit from a downgrade to EXCLUSIVE (which allows ACCESS SHARE through).

## SQLite

SQLite is not affected because its default isolation level is Serializable — concurrent writes block at the database level, so the interleaving described above cannot occur. The lock is a no-op for SQLite in `with_locked_changelog_table()`.

## Test

`test_changelog_race_condition_with_processor` (in `server/service/src/processors/changelog_race_condition_test.rs`) reproduces this race condition using the real `AssignRequisitionNumber` processor on Postgres. It inserts three requisitions with a deliberately delayed middle transaction, then verifies all three are processed. Removing the `LOCK TABLE` statement causes the test to fail. Changing the lock to any level below `SHARE` (e.g. `SHARE UPDATE EXCLUSIVE`) will also cause the test to fail.
