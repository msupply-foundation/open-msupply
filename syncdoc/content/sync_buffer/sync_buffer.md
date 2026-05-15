# Sync buffer scaling benchmark — summary

Issue: [#11090](https://github.com/msupply-foundation/open-msupply/issues/11090)

Full test methodology: see [./bench/README.md](./bench/README.md).
Raw results and charts: [results/results-basic-server-2/](./results/results-basic-server-2/).

## TL;DR

**The hot working set for `sync_buffer` queries is bounded by the number of *pending* rows (rows with `integrated_datetime IS NULL`), not the total table size — as long as the plan only has to touch pending rows. A partial index alone gets you most of the way there, but query latency still creeps up as the table grows because heap fetches are scattered across a bigger and bigger table. LIST-partitioning on `(integrated_datetime IS NULL)` keeps the pending rows co-located in their own small partition, which holds query latency flat.**

**Recommended strategy: keep `sync_buffer` append-only (insert per sync record, no upsert), using `cursor` as the primary key. `record_id` is no longer unique. The only in-place mutations are setting `integrated_datetime` and `integration_error` after a record is processed. Partition by `is_integrated` (boolean), and order queries by `cursor` (not `received_datetime`).**

## What was tested

Four scenarios, inserting into `sync_buffer` up to ~75M rows. After each bench round, all pending rows are integrated except the newest 5M — so the pending partition always holds about 5M rows, while the done partition grows across the run. Each round measures insert throughput (10K-row batches), a filtered pending-rows query, and a bulk mark-integrated UPDATE.

| Scenario | Partitioning | Index |
| --- | --- | --- |
| `basic` | none | partial index on `(table_name, operation_type, source_site_id, cursor DESC) WHERE integrated_datetime IS NULL` |
| `partitioned-both-indexed` | LIST by `(integrated_datetime IS NULL)` | partial index on parent, propagates to both partitions |
| `partitioned-pending-indexed-only` | LIST by `(integrated_datetime IS NULL)` | partial index on the pending partition only |
| `partitioned-done-cursor-10m` | LIST by `(integrated_datetime IS NULL)`; done partition further sub-partitioned by `cursor` range (10M per sub-partition) | partial index on parent, propagates everywhere |

Schema (common columns):

```sql
cursor               BIGINT GENERATED ALWAYS AS IDENTITY,
record_id            TEXT NOT NULL,
received_datetime    TIMESTAMP NOT NULL,
integrated_datetime  TIMESTAMP,
integration_error    TEXT,
table_name           TEXT NOT NULL,
operation_type       TEXT NOT NULL,
data                 TEXT NOT NULL,
source_site_id       INTEGER NOT NULL
```

Run on a single host (`server-2`): Windows Server 2025, Xeon Cascadelake, 3 logical cores, 24 GB RAM, OpenStack. See [results/results-basic-server-2/server_specs.json](./results/results-basic-server-2/server_specs.json).

## Results

Approximate medians across the run (pending partition stable at ~5M, done partition growing to 60–70M).

| Scenario | Query latency @ 500K | Query latency @ ~60–75M | Insert rate | Bulk mark-integrated @ ~60–75M |
| --- | --- | --- | --- | --- |
| `basic` | 1.9 ms | **~76–96 ms** (still trending up) | ~35–50K rows/s | ~30–35 s |
| `partitioned-both-indexed` | 1.1 ms | **~40–50 ms** (flat) | ~45–55K rows/s | ~12 s |
| `partitioned-pending-indexed-only` | 1.1 ms | **~40–45 ms** (flat) | ~45–55K rows/s | ~15–16 s |
| `partitioned-done-cursor-10m` | 1.1 ms | **~40–50 ms** (flat) | ~45–55K rows/s | ~12–16 s |

Charts: `scenario_<name>.png` per scenario and `combined_scenarios.png` in the results folder.

### What the shapes tell us

- **`basic` query latency creeps up.** The partial index itself stays small (~5M entries — one per pending row), so the index scan is cheap. The slow part is the heap fetches: pending rows are interleaved with integrated rows across the whole 60M+ heap, so each row read is likely a different page. The bigger the table, the more scattered those pages are, and the more misses in cache. This is subtle — a partial index *looks* like it should be equivalent to partitioning for this workload, but it isn't.
- **All three partitioned variants are flat.** The pending partition is its own physical table. Its heap contains only pending rows, and with ~5M of them they stay dense and cache-friendly. Partition pruning at plan time ensures the done partition is never touched by the query. Total table size stops mattering.
- **Done-side sub-partitioning (`partitioned-done-cursor-10m`) didn't measurably help.** For the bench query it's irrelevant — partition pruning already excludes the done side. It would matter for operations that do scan the done partition (reintegration, archival), but those weren't the bottleneck here.
- **Bulk mark-integrated is ~2–3× faster under partitioning** (12–16 s vs 30–35 s) because finding the pending rows to update is a partition scan rather than an index-driven scan across a 60M+ heap.

### Indexes don't grow unbounded for the queries we care about

The thing to check before recommending "let the table grow forever" was whether the indexes supporting our hot queries grow without bound. They don't:

- The partial index in `basic` is bounded by *pending* rows, which is stable at the target pending size (5M in the bench, whatever the deployment's steady-state is in practice).
- Under partitioning, the pending partition's indexes are likewise bounded by pending size.
- The PK on `cursor` (a monotonically increasing bigint) grows linearly with total rows, but inserts concentrate at the end of the index, so that growth doesn't hurt insert speed (same reasoning as the `pk_only` scenario in the [changelog bench](../changelog/results/bench_summary.md)).

So the storage-side concern is not "will indexes get pathologically slow", it's just "will total on-disk size be manageable" — a capacity/retention question, not a performance one.

## Recommendation

### Append-only, `cursor` as primary key

Every sync record received is a fresh INSERT. `record_id` is not unique — if the same record arrives again, another row is added. `cursor` (BIGINT auto-increment) is the primary key. The only in-place mutations on sync_buffer are:

- Setting `integrated_datetime` when the row is successfully (or unsuccessfully) integrated.
- Setting `integration_error` if integration failed.

Why append-only:

- Upserts on `record_id` under partitioning need a CTE delete-then-insert to keep uniqueness across partitions, which is ~20–30% slower on write. Append-only avoids that penalty entirely.
- It preserves full sync history for free — every version of every record that was ever received is there, which is useful for diagnostics and for re-integrating fields after remote-site upgrades (see [Historic records](../v7.md#historic-records) in the v7 spec).
- Keeps the write path lean: no lookup, no conflict resolution, no delete.

The cost is that reads need to pick the latest entry per `record_id`. That's fine because:

- The hot path (integration) iterates by `cursor` in order, not by `record_id`, so it naturally sees the latest version last.
- Debugging / re-integration queries can use a `DISTINCT ON (record_id) ... ORDER BY cursor DESC` pattern.

### Partition by `is_integrated` (boolean)

```sql
CREATE TABLE sync_buffer (
    cursor               BIGINT GENERATED ALWAYS AS IDENTITY,
    record_id            TEXT NOT NULL,
    received_datetime    TIMESTAMP NOT NULL,
    is_integrated        BOOLEAN NOT NULL DEFAULT FALSE,
    integrated_datetime  TIMESTAMP,
    integration_error    TEXT,
    table_name           TEXT NOT NULL,
    operation_type       TEXT NOT NULL,
    data                 TEXT NOT NULL,
    source_site_id       INTEGER NOT NULL,
    PRIMARY KEY (cursor, is_integrated)
) PARTITION BY LIST (is_integrated);

CREATE TABLE sync_buffer_pending PARTITION OF sync_buffer FOR VALUES IN (FALSE);
CREATE TABLE sync_buffer_done    PARTITION OF sync_buffer FOR VALUES IN (TRUE);

CREATE INDEX idx_sb_pending_query ON sync_buffer
    (table_name, operation_type, source_site_id, cursor DESC)
    WHERE is_integrated = FALSE;
```

- New rows are inserted with `is_integrated = FALSE` → pending partition.
- Marking integrated is `UPDATE SET is_integrated = TRUE, integrated_datetime = NOW()` — PG 11+ moves the row across partitions automatically.
- Integration workers read from the pending partition, ordered by `cursor` ascending (see below).
- Partition key is a BOOLEAN (not nullable, 1 byte) because PG doesn't allow nullable columns in PKs, so `integrated_datetime IS NULL` can't be used directly.

### Order by `cursor`, not `received_datetime`

- `cursor` is the PK, strictly monotonically increasing, and cheap to scan in order.
- `received_datetime` depends on wall-clock time and can go backwards if the system clock moves; it also requires its own index to be useful for ordering.
- For the integration hot path ("give me the next batch of pending rows in order"), `ORDER BY cursor` uses the PK directly and matches the insertion order closely enough for all practical purposes.

### Notes

- Index choices for the pending partition can stay the same as today's design. The done partition doesn't need secondary indexes for the hot path, since queries filter on `is_integrated = FALSE` and prune it.
- Done-side cursor sub-partitioning was tested and didn't help the measured workload. It's worth revisiting only if we add an operation that scans across the done partition (e.g. reintegration sweeps, archival drops).
- Cross-partition foreign keys to `sync_buffer` are restricted in PG and awkward in diesel — same consideration as the changelog partitioning plan.
- Storage is dominated by the `data` JSON payload (~1.3 KB/row in prior measurements at ~1.2 KB payloads). Indexes are a small fraction of total size. If storage becomes a retention problem, the fix is dropping / archiving old done sub-partitions as whole tables, not deleting rows.

## Conclusion

At scale, query latency against `sync_buffer` only stays flat if the plan can isolate pending rows to a small, dense region of the table. A partial index alone is not enough — it keeps index size bounded but leaves heap fetches scattered. LIST-partitioning on `is_integrated` gives us that isolation and holds query latency flat across the full 75M-row run, with no measurable downside to inserts.

Combined with the append-only design (cursor-PK, no upsert on `record_id`, mutations only for `integrated_datetime` / `integration_error`), this gives us a write path that's lean, a hot-read path that doesn't degrade with history size, and full historic sync data to work with for diagnostics and upgrades.
