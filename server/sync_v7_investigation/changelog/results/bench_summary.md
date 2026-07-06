# Changelog insert-rate benchmark — summary

Full test methodology: see [../bench/README.md](../bench/README.md).
Raw results and charts: [results-basic-partitioned-server1/](results-basic-partitioned-server1) and [results-basic-partitioned-server2/](results-basic-partitioned-server2).

## TL;DR

**The secondary indexes on `changelog` are what make inserts slow down as the table grows. Splitting the table into partitions by `cursor` fixes this: each partition's indexes stay small enough to fit in memory, so insert speed stops dropping as the table gets bigger.**

## What was tested

Three scenarios, inserting into `changelog` up to 100M rows, measuring insert speed (10K-row batches) every 500K rows:

| Scenario | Indexes | Partitioning |
| --- | --- | --- |
| `pk_only` | Primary key on `cursor` only | none |
| `v7` | PK + 4 secondary indexes (`source_site_id`, `store_id`, partial on `transfer_store_id`, partial on `patient_id`) | none |
| `v7_partitioned` | Same 4 secondary indexes | `RANGE (cursor)`, 5M rows per partition |

Run on two different hosts (see `server_specs.json` in each results folder):

- **server1** — Windows Server 2025, Xeon Gold 6242, 6 logical cores, 32 GB RAM, Hyper-V.
- **server2** — Windows Server 2025, Xeon Cascadelake, 3 logical cores, 24 GB RAM, OpenStack.

## Results

| Scenario | server1 (insert rate) | server2 (insert rate) |
| --- | --- | --- |
| `pk_only` | Flat ~85–95K rows/s for the full 100M rows | Flat ~70–85K rows/s for the full 100M rows |
| `v7` | 50K rows/s at start → **4.3K rows/s by ~60M rows** (hit 2h timeout before reaching 100M) | 40K rows/s at start → **2.6K rows/s by ~20M rows** |
| `v7_partitioned` | Sawtooth 20K–55K rows/s, still stable at 100M rows | Sawtooth 15K–50K rows/s, still stable at 100M rows |

Charts: `insert_rate.png` (combined) and `insert_rate_<scenario>.png` in each server's folder.

### What the chart shapes tell us

- **`pk_only` is flat.** The PK is a simple counter. Every insert goes to the end of the index, so only one small part of the index is ever "hot". Table size doesn't matter.
- **`v7` drops steadily.** The four secondary indexes are on UUIDs and an integer that have nothing to do with insert order. Each insert writes to a random spot in each index. While those indexes fit in memory this is cheap; once they don't, every insert hits disk. The bigger the table, the worse it gets.
- **`v7_partitioned` goes up and down in a sawtooth.** Each partition is a separate table with its own indexes. While the current partition is filling up (0 → 5M rows) its indexes are small and inserts are fast. As it fills, inserts slow. Then a new partition starts and the cycle repeats. The key point: **the pattern doesn't trend downward**. Insert speed at 100M rows looks the same as at 10M rows.

## Why the indexes slow things down

The four secondary indexes are on values that are random relative to insert order (UUIDs and a site id spread across ~100 values). So every insert:

- Writes to the end of the PK index (cheap — always hot in memory).
- Writes to a random spot in each of the four secondary indexes.

As long as those indexes fit in Postgres' cache, a "random spot" is a memory access. Once they don't fit, it's a disk seek. Server2 (24 GB RAM) hits the wall sooner than server1 (32 GB RAM), which matches this explanation. The `pk_only` result shows the base table itself is not the bottleneck — remove the secondary indexes and insert speed is flat forever.

> **TODO:** We plan to test sequential UUIDs (e.g. UUIDv7) for `store_id` / `transfer_store_id` / `patient_id`. If the IDs are roughly in time order, inserts concentrate at the end of each index instead of being scattered, which should shrink the hot working set a lot — possibly enough to avoid partitioning. This needs its own benchmark run.

## Proposed mitigation: range-partition by `cursor`

The `cursor` column is already a counter that only goes up. That makes it a natural partitioning key — new rows always go into the newest partition, and queries like `WHERE cursor > ?` only need to touch one or two partitions.

### Strategy

```sql
CREATE TABLE changelog (
    cursor BIGINT NOT NULL DEFAULT nextval('changelog_cursor_seq'),
    record_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    row_action row_action_type NOT NULL,
    source_site_id INTEGER,
    store_id UUID,
    transfer_store_id UUID,
    patient_id UUID
) PARTITION BY RANGE (cursor);
```

Each partition (`changelog_p0`, `changelog_p1`, …) covers a fixed cursor range (5M rows in the benchmark). The four secondary indexes are defined on the parent table and Postgres creates matching indexes on each partition.

### Why it fixes the scaling problem

1. **Only the newest partition is being written to.** Its indexes stay small enough to fit in cache no matter how many old partitions exist.
2. **Old partitions go quiet.** After a partition fills, it's only read (for replication / catch-up). Its index pages drop out of cache on their own without affecting writes.
3. **Readers don't need to change.** Consumers read `changelog WHERE cursor > ?`. Postgres will only touch the partitions covering that range.
4. **Easier housekeeping.** Old partitions can be dropped or archived as whole tables (`DROP TABLE changelog_pN`), which is a metadata change — much cheaper than deleting millions of rows from one big table.

### Partition management (in Rust, not pg_partman)

We will **maintain partitions from Rust code in open-mSupply**, not with `pg_partman` or similar extensions. Reasoning: avoiding a Postgres extension keeps setup simple for deployments and central servers.

This will be a **scheduled background task** in the server. It will:

1. Check the current max `cursor` value.
2. Create the next partition(s) ahead of time so inserts never hit a missing range.
3. Run the changelog deduplication pass (below) in the same task.

### Interaction with deduplication

We already need to deduplicate the changelog on a schedule — collapse multiple changes to the same record down to one row so consumers only see the latest. This will be the **same scheduled task** that creates new partitions.

A few things to be aware of once the table is partitioned:

- **Dedup deletes rows from old partitions.** If record R has an old entry in partition `p3` and a newer entry in partition `p7`, dedup deletes the row in `p3`. Postgres handles cross-partition DELETEs fine, but the delete leaves dead tuples in the old partition's heap and indexes until `VACUUM` runs. Old partitions need autovacuum enabled or a scheduled vacuum.
- **"Old partitions are read-only" stops being strictly true.** They're still mostly read-only — dedup writes are small compared to insert traffic — so the cache argument for partitioning still holds.
- **Dedup is cheaper with partitioning.** Dedup can run partition-by-partition instead of scanning the whole table.
- **Bloat in old partitions, if it ever matters, is fixable by rewriting that one partition** (`VACUUM FULL changelog_pN` or re-create + swap), without touching the rest of the table.

### Migration path

**Rebuild `changelog` from scratch.** The existing unpartitioned table is replaced with a partitioned one and the data is reinserted. This is simpler than in-place conversion and, because the changelog can be regenerated from the source tables, there's no risk of data loss. To be scoped as its own piece of work.

### Parameters still to decide

- **Partition size.** 5M worked well in the bench (sawtooth floor around 20K rows/s on both servers). Smaller = shallower dips but more partitions to manage. Larger = lower floors. Pick based on expected insert rate per deployment.
- **How far ahead to pre-create partitions.** Enough to cover the gap between scheduled runs plus a safety margin.

## Conclusion

Secondary indexes — specifically ones on values unrelated to insert order — are what make changelog inserts slow down as the table grows. The `v7` scenario lost more than 10× its insert speed before hitting 100M rows on both servers. Partitioning by `cursor` keeps each partition's indexes small and holds insert speed steady across the full 100M rows. Recommend moving forward with cursor-range partitioning, managed by a scheduled task in the Rust server that also handles deduplication. A follow-up benchmark should check whether sequential UUIDs alone would be enough to avoid partitioning.
