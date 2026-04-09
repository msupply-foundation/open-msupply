# Current Fix: Table-Level Lock on Changelog Reads

Issue: [#11087](https://github.com/msupply-foundation/open-msupply/issues/11087)
Original fix: [PR #3904](https://github.com/msupply-foundation/open-msupply/pull/3904)

## How it works

All changelog read methods that are used with cursor-based progression use `with_locked_changelog_table()`, which acquires a table-level lock before reading:

```sql
LOCK TABLE ONLY changelog IN ACCESS EXCLUSIVE MODE
```

This lock:
- **Waits** for any uncommitted writers to finish (ACCESS EXCLUSIVE conflicts with all other lock types)
- **Blocks** all other operations on the table while the read is in progress
- The lock is the most restrictive level available in Postgres

The lock is held only for the duration of the read query, not during processing. The flow is: acquire lock -> read batch -> release lock -> process records -> update cursor.

## Lock level comparison

We currently use **ACCESS EXCLUSIVE**, the most restrictive lock level. The minimum level that prevents this race condition is **SHARE** (the first level that conflicts with ROW EXCLUSIVE). Here is a comparison:

| Lock level | Prevents race condition | Allows concurrent locked reads | Allows plain SELECT |
|---|---|---|---|
| SHARE | Yes | Yes — multiple readers can stack up, blocking writers for longer | Yes |
| EXCLUSIVE | Yes | No — readers serialized, keeping write-blocking windows short | Yes |
| ACCESS EXCLUSIVE (current) | Yes | No | No — blocks everything including plain SELECTs |

**SHARE** allows multiple changelog readers (processors, sync pulls) to hold the lock simultaneously. While individually correct, stacking readers extends the window during which all changelog writes are blocked. This could cause write starvation during busy sync periods (e.g. multiple sites pulling concurrently while another site is pushing).

**EXCLUSIVE** serializes changelog reads so that each write-blocking window is bounded to a single read operation, while still allowing plain SELECTs (e.g. `count()` queries) to proceed. This may be a better trade off but requires performance testing to see if reads actually get starved on a busy system.

**ACCESS EXCLUSIVE** (current) additionally blocks plain SELECTs. This is more restrictive than necessary — the race condition only involves writers, not readers. Could be downgraded to EXCLUSIVE.

## Methods protected by the lock

- `changelogs()` — used by all processors
- `outgoing_sync_records_from_central()` — used by sync pull from central
- `outgoing_patient_sync_records_from_central()` — used by patient sync pull

Note: `count()` and `count_outgoing_sync_records_from_central()` do **not** use the lock, because they don't advance a cursor and therefore aren't susceptible to the race condition.

## SQLite

SQLite is not affected because its default isolation level is Serializable — concurrent writes block at the database level, so the interleaving described above cannot occur. The lock is a no-op for SQLite in `with_locked_changelog_table()`.

## Test

`test_changelog_race_condition_with_processor` (in `server/service/src/processors/changelog_race_condition_test.rs`) reproduces this race condition using the real `AssignRequisitionNumber` processor on Postgres. It inserts three requisitions with a deliberately delayed middle transaction, then verifies all three are processed. Removing the `LOCK TABLE` statement causes the test to fail. Changing the lock to any level below `SHARE` like `SHARE UPDATE EXCLUSIVE` will also cause the test to fail.
