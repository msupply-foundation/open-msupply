+++
title = "Changelog Partitioning"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Changelog Partitioning

`changelog` is the largest table on a central server and grows without bound. On Postgres it is
range-partitioned by `cursor` so each partition's indexes stay small enough to remain in cache and
the insert rate stays flat as the table grows (see the
[sync v7 design](@/docs/sync/v7/_index.md#performance-considerations) for the benchmark). SQLite
is not partitioned; everything on this page is Postgres-only.

Requires Postgres 12 or higher. The server checks `server_version_num` when the connection pool is
built and refuses to start below 12. This covers the server, every CLI action and the test
harness, since they all build the pool the same way.

## Terms

- **cursor**: the row id, taken from a sequence, so it only increases.
- **partition**: a child table holding one range of cursors.
- **top bound**: the highest cursor the range partitions cover.
- **headroom**: top bound minus the current sequence position, i.e. how many more rows can be
  inserted before the range partitions run out.
- **lookahead**: the headroom the top-up task keeps.
- **top-up**: the scheduled task that adds partitions when headroom falls below the lookahead.

## Layout

- Range partitions are named `changelog_p_<lower>` and cover `[lower, lower + partition_size)`.
  They are contiguous from cursor 1.
- `changelog_p_default` is the DEFAULT partition. A row whose cursor is above the top bound lands
  there instead of the insert failing. It is normally empty.

Migrations create the partitioned table, its initial range partitions and the DEFAULT partition.

## Creating a partition

Two statements, never `CREATE TABLE … PARTITION OF`:

```sql
CREATE TABLE changelog_p_<lower> (LIKE changelog INCLUDING ALL);
ALTER TABLE changelog ATTACH PARTITION changelog_p_<lower> FOR VALUES FROM (<lower>) TO (<upper>);
```

`INCLUDING ALL` copies the primary key index so Postgres adopts it on attach instead of building
one under a lock. Do not trim it. The migration and the top-up run the same two statements.

### Why

`CREATE TABLE … PARTITION OF` takes `ACCESS EXCLUSIVE` on `changelog`. During a long integration
transaction, which holds `ROW EXCLUSIVE` on `changelog` for its whole run, that request queues
behind the integration. Postgres grants locks in order, so every later changelog read and write
queues behind the waiting request too. Waiting requests hold pool connections, the pool exhausts,
and the server stops responding until the integration commits.

From Postgres 12, `ATTACH PARTITION` takes only `SHARE UPDATE EXCLUSIVE` on `changelog`, which
does not conflict with `ROW EXCLUSIVE`. Partition creation runs alongside an integration without
blocking anything. Earlier Postgres versions take `ACCESS EXCLUSIVE` for the attach as well, which
is why the version floor exists. Do not reintroduce `PARTITION OF`.

The attach also takes `ACCESS EXCLUSIVE` on the DEFAULT partition, to check it holds no rows in the
new range. Any query that reads the DEFAULT conflicts with that lock, including unbounded `cursor`
reads and the cursor tracker's `max(cursor)`, since the DEFAULT can't be pruned for those. A
transaction that has read `changelog` holds its lock on the DEFAULT until it ends, so the attach has
to wait for it to finish, and any new reads of the DEFAULT have to wait for the attach, for up to
the 500 ms `lock_timeout`.

## The top-up task

Runs every `interval`. Each tick:

1. Reads the top bound, the row count in the DEFAULT partition, and the sequence position.
2. Creates range partitions upward from the top bound until headroom reaches the lookahead. Each
   partition is one transaction.
3. If the DEFAULT partition holds rows for a range being created, they are moved into the new table
   before it is attached. Postgres refuses to attach a range partition while the DEFAULT holds rows
   in that range.

Each partition's transaction runs under a 500 ms `lock_timeout`, the initial read under 2 seconds.
If a partition's timeout fires, that partition rolls back, earlier ones from the same tick stay, and
the task retries next tick. A transaction that has written to the DEFAULT partition holds
`ROW EXCLUSIVE` on it and so blocks the attach until it commits; inserts keep succeeding into the
DEFAULT meanwhile.

## Settings

`changelog_partition` in the server config sets `partition_size` (cursor values per partition),
`lookahead` and `interval` (see `example.yaml` for defaults). A `lookahead` below the default is
clamped up to it, so headroom never drops below the default by configuration.

The DEFAULT partition is the safety net for when the write rate outruns the lookahead within one
interval, or when the top-up is locked out for long enough.

## Logging

Server log:

- `INFO` per partition created.
- `WARN` per partition that received rows moved from the DEFAULT partition.
- `WARN` on a lock timeout, with how many partitions were created that tick and the headroom left.

System log, type `DATABASE_ERROR`, each also echoed to the server log at `ERROR`:

- Rows were found in the DEFAULT partition. The write rate outran the lookahead since the previous
  tick. If this recurs, raise `lookahead` or shorten `interval`.
- The top-up was locked out on consecutive ticks with less than one partition of headroom left.
  Something holds a conflicting lock on `changelog`, typically a long integration transaction.

Both rows repeat each tick while the condition persists.

## CLI

`reintegrate-buffer` runs without the server and so without the top-up task. A replay that writes
more changelog rows than the remaining headroom overflows into the DEFAULT partition; the next
server start moves those rows into range partitions.
