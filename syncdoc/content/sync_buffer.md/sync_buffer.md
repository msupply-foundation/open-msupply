# Sync Buffer Scaling Research

Issue: [#11090](https://github.com/msupply-foundation/open-msupply/issues/11090)

## The problem

The `sync_buffer` table is designed to be an upsert-only log of all sync records
received from remote sites. It never deletes records, and instead relies on the
`integration_datetime` field to mark which records have been processed by sync.
The concern is that the performance of both reads and writes will degrade as the
table grows, especially for deployments with millions of records.

## Approach

The sync buffer will be tested at scale with realistic data and workloads to
understand the actual performance. We will benchmark both reads and writes
across a range of table sizes from 1K to 30M rows, both with and without a
partial index on unintegrated records. We will also evaluate LIST partitioning
by integration status as a way to keep queries fast at scale, and measure
the operational overhead of large tables.

## Standard Benchmark Results

Setup: Table populated with 99% integrated records, 1% unintegrated. 10
different table_names, 10 source_site_ids. Each record's `data` field contains a
mock trans_line JSON payload.

Benchmarks tested both **raw** and **in tx**.

> **Note**: These numbers are from the standalone Python script
> (`bench_sync_buffer.py`), which sends raw SQL via psycopg2. Production uses
> diesel, which adds ~20-30% overhead per statement for ORM row mapping, type
> checking, and connection lock acquisition. Expect production numbers to be
> proportionally slower.

### Without Partial Index (existing indexes only)

`Filter: action = 'UPSERT' AND table_name = 'transact' AND source_site_id = 1
AND integration_datetime IS NULL.`

| Operation                     | 1K       | 10K      | 100K     | 1M       | 30M      |
| ----------------------------- | -------- | -------- | -------- | -------- | -------- |
| Upsert 1K new (raw)           | 135ms    | 131ms    | 146ms    | 147ms    | 166ms    |
| Upsert 1K existing (raw)      | 79ms     | 79ms     | 86ms     | 86ms     | 97ms     |
| Upsert 1K new (in tx)         | **60ms** | **60ms** | **64ms** | **77ms** | **84ms** |
| Upsert 1K existing (in tx)    | **60ms** | **63ms** | **64ms** | **66ms** | **71ms** |
| Query unintegrated (filtered) | <1ms     | <1ms     | <1ms     | <1ms     | 360ms    |
| Query unintegrated (all)      | <1ms     | <1ms     | 2ms      | 25ms     | 600ms    |
| Mark N integrated (raw)       | 1ms      | 5ms      | 46ms     | 498ms    | —        |
| Mark N integrated (in tx)     | <1ms     | 3ms      | 33ms     | 381ms    | 11ms     |
| Re-sync 100 (in tx)           | 7ms      | 8ms      | 8ms      | 9ms      | 10ms     |

### With Partial Index

| Operation                     | 1K   | 10K  | 100K | 1M   | 30M     |
| ----------------------------- | ---- | ---- | ---- | ---- | ------- |
| Query unintegrated (filtered) | <1ms | <1ms | 1ms  | <1ms | **2ms** |
| Upsert 1K new (in tx)         | 66ms | 75ms | 78ms | 78ms | 95ms    |

## Analysis

### Reads Scale Well Up to 1M, Degrade at 30M

Filtered queries for unintegrated records remain constant from 1K to 1M (<1ms).
At 30M, however, the filtered query degrades to ~360ms because it must scan the
entire table to find the 300K unintegrated rows. The "Query unintegrated (all)"
results show the cost of deserializing large result sets: ~600ms for 300K rows at
30M table size.

### Writes Remain Stable

Benchmarks test both raw and in-transaction.

|            | Raw   | In transaction         |
| ---------- | ----- | ---------------------- |
| 1K table   | 135ms | **60ms** (2.3x faster) |
| 10K table  | 131ms | **60ms** (2.2x faster) |
| 100K table | 146ms | **64ms** (2.3x faster) |
| 1M table   | 147ms | **77ms** (1.9x faster) |
| 30M table  | 169ms | **83ms** (2.0x faster) |

Transaction wrapping provides a consistent ~2x improvement across all sizes.

### Partial Index Required at 30M

At 1M and below, the partial index showed no significant improvement. Filtered
queries are already sub-millisecond. **At 30M, the difference is dramatic:**
~360ms without → **2ms** with the partial index (~180x improvement).

## Operational Overhead at 30M Rows

Beyond query/write performance, large tables impose operational costs. Here are
measurements from the 30M test database:

### Storage Breakdown

_Measured with ~1.2 KB invoice-line JSON payloads at 30M rows._

| Component                                                                   | Size     | Notes                                                             |
| --------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| Table data (heap)                                                           | 38 GB    | ~1.3 KB/row average                                               |
| Primary key index (`record_id` TEXT)                                        | 1,551 MB | 4% of data size — TEXT PKs are expensive                          |
| Combined index `(action, table_name, integration_datetime, source_site_id)` | 189 MB   | Covers all hot-path queries when single-column indexes are absent |
| `index_sync_buffer_action`                                                  | 184 MB   | Redundant — combined index leads with `action`                    |
| `index_sync_buffer_integration_error`                                       | 184 MB   | Only used by one-time migration reintegration queries             |
| `index_sync_buffer_integration_datetime`                                    | 184 MB   | Overlaps with combined index (3rd column)                         |
| **All indexes total**                                                       | 2,293 MB | 6% of total relation size                                         |
| **Total (data + indexes)**                                                  | 40 GB    | ~40 GB for 30M rows                                               |

**Key finding**: The heap dominates storage at 38 GB — indexes are only 6% of
the total. Three of the five indexes (`action`, `integration_error`,
`integration_datetime`) are redundant with the combined index. When all indexes
are present, the planner _does_ use the single-column indexes — e.g.
`integration_datetime` for the hot path (because `IS NULL` is highly selective
at 1% of rows) and `action` for `DELETE`/`MERGE` queries (because those enum
values match 0 rows). However, after dropping them and running `ANALYZE`, the
combined index handles all queries with sub-ms read performance, while **upserts
improve by ~42%** (22ms vs 38ms for 1K upserts at 1M rows) due to fewer indexes
to maintain. Removing the three redundant indexes would:

- Save ~552 MB disk
- **Speed up upserts ~42%** (fewer indexes to maintain per write)
- Reduce WAL generation per write

### Operational Notes

- **VACUUM**: Autovacuum handles the workload well — dead tuple ratio stays very
  low (~0.01% on 30M rows). ANALYZE takes ~3.5s on 30M rows.
- **WAL**: 1K upserts with ~1.2 KB payloads generate ~1.7 MB of WAL.
- **TOAST**: The ~1.2 KB test payloads don't trigger TOAST (threshold is ~2 KB).
  Production payloads larger than 2 KB will be automatically TOASTed, which
  would reduce heap size but add indirection for reads.

## Approaches Evaluated

| Approach                           | Recommendation                        | Rationale                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Archive table**                  | Not needed up to 1M+                  | Reads and writes scale well up to 1M.                                                                                                                                                                                                                                                                                                                                    |
| **LIST partition (is_integrated)** | **Recommended for scale**             | Native PG partitioning with `is_integrated BOOLEAN`. Upserts ~30% slower due to CTE delete-then-insert for cross-partition correctness, if we are okay with having duplicate entries, then ignore upsert comment, but queries are dramatically faster at scale (0.4ms vs 360ms at 30M). PG 11+ handles cross-partition row movement automatically. See benchmarks below. |
| **Periodic deletion**              | Not recommended                       | Destroys data needed for debugging and migration re-integration.                                                                                                                                                                                                                                                                                                         |
| **Drop redundant indexes**         | **Recommended**                       | Three single-column indexes are redundant with the combined index. The planner does use them when present, but the combined index covers all queries after `ANALYZE`. Dropping them improves upsert throughput ~42% and saves ~552 MB at 30M.                                                                                                                            |
| **Partial index**                  | **Recommended** (if not partitioning) | Low cost, improves cold-cache queries at scale. Not needed if using LIST partitioning since the pending partition is inherently small.                                                                                                                                                                                                                                   |

## Partitioning by Integration Status

### Recommended approach: `is_integrated BOOLEAN` partition key

Native PostgreSQL LIST partitioning using an `is_integrated BOOLEAN` column as the partition key. The PK becomes `(record_id, is_integrated)`. PostgreSQL requires the partition key in any unique constraint, just like any partitioned table:

```sql
CREATE TABLE sync_buffer (
    record_id            TEXT NOT NULL,
    received_datetime    TIMESTAMP NOT NULL,
    is_integrated        BOOLEAN NOT NULL DEFAULT FALSE,
    integration_datetime TIMESTAMP,
    integration_error    TEXT,
    table_name           TEXT NOT NULL,
    action               sync_action NOT NULL,
    data                 TEXT NOT NULL,
    source_site_id       INTEGER,
    PRIMARY KEY (record_id, is_integrated)
) PARTITION BY LIST (is_integrated);

CREATE TABLE sync_buffer_pending PARTITION OF sync_buffer FOR VALUES IN (FALSE);
CREATE TABLE sync_buffer_done    PARTITION OF sync_buffer FOR VALUES IN (TRUE);
```

**How it works:**

- New records are inserted with `is_integrated = FALSE` → routed to `sync_buffer_pending`
- Mark integrated: `UPDATE SET is_integrated = TRUE, integration_datetime = NOW()` → PostgreSQL 11+ **automatically moves the row** from `pending` to `done` (cross-partition row movement)
- Re-sync: `UPDATE SET is_integrated = FALSE, integration_datetime = NULL, data = ...` → automatically moves back from `done` to `pending`
- Queries for unintegrated records use `WHERE is_integrated = FALSE` → PostgreSQL prunes to the `pending` partition only
- Upserts for new records: `INSERT ... ON CONFLICT (record_id, is_integrated) DO UPDATE` works within the pending partition
- _(NOTE: This isn't a valid statement anymore if we want all history of sync
  i.e. inserts of every instance of a record instead of upserting)_ Upserts for already-integrated records: A CTE deletes the integrated
  row before inserting the pending replacement, since the conflict key
  `(record_id, is_integrated)` won't match across partitions:

```sql
WITH moved AS (
    DELETE FROM sync_buffer
    WHERE record_id = $1 AND is_integrated = TRUE
    RETURNING record_id
)
INSERT INTO sync_buffer (record_id, ..., is_integrated, ...)
VALUES ($1, ..., FALSE, ...)
ON CONFLICT (record_id, is_integrated) DO UPDATE SET ...;
```

**Why `is_integrated BOOLEAN` instead of `integration_datetime IS NULL`:**

- `integration_datetime` is nullable, and PostgreSQL does not allow nullable columns in primary keys — so it cannot be used as a partition key in a composite PK
- A `BOOLEAN` column is non-nullable, small (1 byte), and maps directly to the two partitions

### Benchmark: Partitioned vs Standard

Three variants are compared:

- **standard** — current single-table design
- **partitioned** — LIST-partitioned with CTE delete-then-insert to guarantee uniqueness by `record_id` across partitions
- **partitioned-naive** — LIST-partitioned with plain `INSERT ... ON CONFLICT (record_id, is_integrated)`. Cheaper, but the same `record_id` can exist in both pending and done partitions.

At 1M rows (10K pending, 990K integrated):

| Operation                     | standard | partitioned | partitioned-naive |
| ----------------------------- | -------- | ----------- | ----------------- |
| Upsert 1K new (in tx)         | 79ms     | 92ms        | **74ms**          |
| Upsert 1K existing (in tx)    | 65ms     | 90ms        | **64ms**          |
| Upsert 100 integrated         | 22ms     | 22ms        | **11ms**          |
| Query unintegrated (filtered) | 3.7ms    | **0.14ms**  | 0.2ms             |
| Query all unintegrated        | 23ms     | 25ms        | **20ms**          |
| Mark 100 integrated (in tx)   | 9ms      | 7ms         | **6ms**           |
| Re-sync 100 (in tx)           | 10ms     | 10ms        | **7ms**           |

At 30M rows (300K pending, 29.7M integrated):

| Operation                     | standard | partitioned | partitioned-naive |
| ----------------------------- | -------- | ----------- | ----------------- |
| Upsert 1K new (in tx)         | **99ms** | 114ms       | 100ms             |
| Upsert 1K existing (in tx)    | 92ms     | 97ms        | 94ms              |
| Upsert 100 integrated         | 54ms     | 53ms        | **11ms**          |
| Query unintegrated (filtered) | 375ms    | **0.7ms**   | 1.4ms             |
| Query all unintegrated        | 736ms    | 748ms       | **544ms**         |
| Mark 100 integrated (in tx)   | **12ms** | **11ms**    | 72ms              |
| Re-sync 100 (in tx)           | **12ms** | 14ms        | 15ms              |

### Analysis

**Keeping one record in the between partitions is ~20-30% slower** due to the CTE delete-then-insert. The extra DELETE is a no-op for pending rows but must still be executed (114ms vs 99ms for new rows at 30M).

**Naive partitioned upserts match standard on writes** (no CTE overhead) while gaining partition-pruned queries. Trade-off: duplicate `record_id`s accumulate across partitions — acceptable if we want full sync history, a problem if upsert semantics are required. `upsert_100_integrated` is ~5x faster (11ms vs 54ms at 30M) because the naive path doesn't scan the done partition to delete.

**Query performance is the major win for both partitioned variants**: filtered queries are 0.7-1.4ms vs 375ms (standard) at 30M — a **~270-530x improvement** via partition pruning.

**Mark-integrated is slow for naive at 30M** (72ms vs 12ms): `UPDATE SET is_integrated = TRUE` triggers cross-partition row movement that can collide with existing duplicates in the done partition.

### Schema changes required

1. Add `is_integrated BOOLEAN NOT NULL DEFAULT FALSE` column
2. Change PK from `(record_id)` to `(record_id, is_integrated)`
3. Convert to partitioned table with two partitions
4. Update mark-integrated to `UPDATE SET is_integrated = TRUE`
5. Update queries to filter on `is_integrated = FALSE` instead of
   `integration_datetime IS NULL`

### Drawbacks of partitioning

- **Queries must include the partition key to benefit from pruning.** This is already handled for the current `is_integrated` key. However, any future change to the partition key requires reviewing every query on `sync_buffer`, queries that don't filter on the new key will scan all partitions, and lookups by non-partition-key columns (e.g. `record_id` alone) will need to probe every partition instead of one.
- **Every schema change must be applied to every partition.** Adding a column, index, or constraint on the parent table propagates to children in PG 11+, but partition-specific indexes (e.g. `idx_pt_pending_combined`) must be managed explicitly.
- **Uneven partition sizes.** The split is 1% pending / 99% done, which is the whole point for reads. But the `done` partition grows unbounded. The same storage-growth concern as the current single-table design, just scoped to one partition. No rebalancing is needed since the split is by boolean.
- **Foreign keys referencing the partitioned table are restricted.** PG supports this from 12+, but some tooling and ORMs (including diesel) may need workarounds.
- **Operational tooling.** Backups, VACUUM, and monitoring all need to handle multiple relations per logical table. Most tools handle this, but it's extra surface area.
