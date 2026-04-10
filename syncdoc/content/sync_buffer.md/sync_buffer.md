# Sync Buffer Scaling Research

Issue: [#11090](https://github.com/msupply-foundation/open-msupply/issues/11090)

## The problem

The `sync_buffer` table is designed to be an upsert-only log of all
sync records received from remote sites. It never deletes records, and instead
relies on the `integration_datetime` field to mark which records have been
processed by sync. The concern is that the performance of
both reads and writes will degrade as the table grows, especially
for deployments with millions of records.

## Approach

The sync buffer will be tested at scale with realistic data and workloads to
understand the actual performance. We will benchmark both reads
and writes across a range of table sizes from 1K to 30M rows, both with and
without a partial index on unintegrated records. We will also evaluate
LIST partitioning by integration status as a way to keep queries fast at
scale, and measure the operational overhead of large tables.

## Standard Benchmark Results

Setup: Table populated with 99% integrated records, 1% unintegrated. 10
different table_names, 10 source_site_ids. Each record's `data` field contains
a a mock trans_line JSON payload.

Benchmarks tested both **raw** and **in tx**.

> **Note**: These numbers are from the standalone Python script
> (`bench_sync_buffer.py`), which sends raw SQL via psycopg2. Production uses
> diesel, which adds ~20-30% overhead per statement for ORM row mapping, type
> checking, and connection lock acquisition. Expect production numbers to be
> proportionally slower.

### Without Partial Index (existing indexes only)

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
| Re-sync 100 (in tx)           | —         | —         | —         | —         | 23ms     |

### With Partial Index

| Operation                     | 1K   | 10K  | 100K | 1M   | 30M     |
| ----------------------------- | ---- | ---- | ---- | ---- | ------- |
| Query unintegrated (filtered) | <1ms | <1ms | 1ms  | <1ms | **2ms** |
| Upsert 1K new (in tx)         | 66ms | 75ms | 78ms | 78ms | 95ms    |
