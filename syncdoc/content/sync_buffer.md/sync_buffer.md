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

| Operation                     | 1K        | 10K       | 100K      | 1M        | 30M      |
| ----------------------------- | --------- | --------- | --------- | --------- | -------- |
| Upsert 1K new (raw)           | 135ms     | 131ms     | 146ms     | 147ms     | —        |
| Upsert 1K existing (raw)      | 79ms      | 79ms      | 86ms      | 86ms      | —        |
| Upsert 1K new (in tx)         | **60ms**  | **60ms**  | **64ms**  | **77ms**  | **83ms** |
| Upsert 1K existing (in tx)    | **60ms**  | **63ms**  | **64ms**  | **66ms**  | **71ms** |
| Upsert 1K + history (in tx)   | **133ms** | **134ms** | **134ms** | **138ms** | —        |
| Query unintegrated (filtered) | <1ms      | <1ms      | <1ms      | <1ms      | 343ms    |
| Query unintegrated (all)      | <1ms      | <1ms      | 2ms       | 25ms      | 749ms    |
| Mark N integrated (raw)       | 1ms       | 5ms       | 46ms      | 498ms     | —        |
| Mark N integrated (in tx)     | <1ms      | 3ms       | 33ms      | 381ms     | 17ms     |
| Re-sync 100 (in tx)           | 7ms       | 8ms       | 8ms       | 9ms       | 23ms     |

### With Partial Index

| Operation                     | 1K   | 10K  | 100K | 1M   | 30M     |
| ----------------------------- | ---- | ---- | ---- | ---- | ------- |
| Query unintegrated (filtered) | <1ms | <1ms | 1ms  | <1ms | **2ms** |
| Upsert 1K new (in tx)         | 66ms | 75ms | 78ms | 78ms | 95ms    |

## Analysis

### Reads Scale Well Up to 1M, Degrade at 30M

Filtered queries for unintegrated records remain constant from 1K to 1M (<1ms).
At 30M, however, the filtered query degrades to 343ms because it must scan the
entire table to find the 300K unintegrated rows. The "Query unintegrated (all)"
results show the cost of deserializing large result sets: 749ms for 300K rows at
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
343ms without → **2ms** with the partial index (172x improvement).

## Operational Overhead at 30M Rows

Beyond query/write performance, large tables impose operational costs. Here are
measurements from the 30M test database:

### Storage Breakdown

_Measured with ~1.2 KB invoice-line JSON payloads at 30M rows._

| Component                                                                   | Size     | Notes                                                             |
| --------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| Table data (heap)                                                           | 38 GB    | ~1.3 KB/row average with realistic payloads                       |
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
