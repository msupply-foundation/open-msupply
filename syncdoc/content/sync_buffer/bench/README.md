# Sync Buffer Benchmarks

Scripts to benchmark `sync_buffer` table designs (plain table, LIST partitioned
by `integrated_datetime IS NULL`, further RANGE partitioned by `cursor`) across
insert, query, and update workloads. Produces a CSV of timings that can be
plotted.

## Files

- `bench_sync_buffer.py` — the benchmark runner. Reads `bench_config.json`,
  creates the database, runs each scenario, writes per-iteration timings to a
  CSV.
- `plot_sync_buffer.py` — reads one or more CSVs and produces PNG charts
  (per-scenario and combined).
- `bench_config.json` — postgres connection, global knobs, and scenario list.

## Requirements

- Python 3.9+
- PostgreSQL 11+ (partition pruning requires ≥ 11)
- `pip install psycopg2-binary matplotlib` (on macOS use
  `pip3 install --break-system-packages psycopg2-binary matplotlib`)

## Quick start

```bash
# Run the bench
python3 bench_sync_buffer.py --config bench_config.json --csv results.csv

# Plot the results
python3 plot_sync_buffer.py results.csv --output-dir plots
```

The database (`sync_buffer_bench` by default) is created automatically if it
doesn't exist.

### Plotting multiple runs

```bash
python3 plot_sync_buffer.py run1.csv run2.csv --output-dir plots
```

Produces individual per-scenario PNGs and a `combined_scenarios.png` with every
scenario overlaid.

## Running detached

### macOS / Linux

```bash
# nohup + background + redirect logs
nohup python3 bench_sync_buffer.py --config bench_config.json --csv results.csv \
  > bench.log 2>&1 &

# Check progress
tail -f bench.log

# Find and kill later
pkill -f bench_sync_buffer
```

Optional: prevent macOS from sleeping while the bench is running:

```bash
caffeinate -d -i nohup python3 bench_sync_buffer.py --config bench_config.json \
  --csv results.csv > bench.log 2>&1 &
```

### Windows (PowerShell)

```powershell
Start-Process -FilePath "python" `
  -ArgumentList "bench_sync_buffer.py","--config","bench_config.json","--csv","results.csv" `
  -RedirectStandardOutput "bench.out.log" `
  -RedirectStandardError  "bench.err.log" `
  -WorkingDirectory (Get-Location) `
  -WindowStyle Hidden
```

Check progress:

```powershell
Get-Content bench.err.log -Wait -Tail 50
```

Stop it later:

```powershell
Get-Process python | Where-Object { $_.CommandLine -like "*bench_sync_buffer*" } | Stop-Process
```

## Config reference (`bench_config.json`)

```json
{
  "postgres": {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "postgres",
    "database": "sync_buffer_bench"
  },
  "global": {
    "insert_between_benches": "500K",
    "insert_batch_size": "10K",
    "insert_iterations": 3,
    "query_iterations": 1,
    "max_minutes_per_scenario": 240,
    "max_total_records": "100M",
    "target_pending_after_bench": "5M",
    "table_names_count": 100,
    "source_site_ids_count": 1000,
    "rankings": [
      {"table": 5, "ranking": 60},
      {"table": 80, "ranking": 20},
      {"site": 2, "ranking": 100},
      {"site": 33, "ranking": 40}
    ],
    "query_specs": [
      {"table": 5, "site": 2},
      {"table": 80, "site": 33},
      {"table": 99, "site": 999}
    ]
  },
  "scenarios": [ ... ]
}
```

### Global settings

| Key | Meaning |
| --- | --- |
| `insert_between_benches` | Rows bulk-inserted between each bench round (untimed, grows the table). Use K/M suffix. |
| `insert_batch_size` | Rows per timed insert iteration. |
| `insert_iterations` | Number of timed insert iterations per bench round. |
| `query_iterations` | How many times to run the query sweep per bench round. Each sweep runs the query for every spec in `query_specs` (or all combinations if omitted) × 2 operation types. |
| `max_minutes_per_scenario` | Wall-clock cap for each scenario. |
| `max_total_records` | Stop a scenario once the table reaches this size. |
| `target_pending_after_bench` | After each bench round, all pending rows are integrated except the newest N. |
| `table_names_count` | Number of unique UUID-based `table_name` values to generate (e.g. `tbl_a3f8c1e2…`). Non-sequential to reflect real index distribution. |
| `source_site_ids_count` | Number of unique `source_site_id` values (`1..N`). |
| `rankings` | Array of objects controlling how likely a table or site is to appear in inserted data. Each object has either a `table` or `site` key (0-indexed) and a `ranking` value. Ranking is a relative weight — a table with ranking 5 gets 5× the rows of a ranking-1 table. Unmentioned tables/sites default to ranking 1. |
| `query_specs` | Array of `{"table": N, "site": N}` objects (0-indexed) specifying which table/site pairs to query-bench. If omitted, all `table × site` combinations are tested. |

Size values accept `1000`, `"1K"`, `"1.5M"`, etc.

## Scenarios

Every scenario drops the `sync_buffer` table first, then creates the schema
shown below. The common column definition is:

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

Pending rows are identified by `integrated_datetime IS NULL`. A partial index
covers the bench query:

```sql
(table_name, operation_type, source_site_id, cursor DESC)
WHERE integrated_datetime IS NULL
```

### 1. `basic`

Single table, partial index. Baseline — no partitioning.

```sql
DROP TABLE IF EXISTS sync_buffer CASCADE;
CREATE TABLE sync_buffer (
    /* common columns */,
    PRIMARY KEY (cursor)
);
CREATE INDEX idx_sb_pending_query ON sync_buffer
    (table_name, operation_type, source_site_id, cursor DESC)
    WHERE integrated_datetime IS NULL;
```

### 2. `partitioned-indexed`

LIST partitioned by `(integrated_datetime IS NULL)`; index defined on the
parent table so it auto-propagates to all partitions.

```sql
DROP TABLE IF EXISTS sync_buffer CASCADE;
CREATE TABLE sync_buffer (
    /* common columns */
) PARTITION BY LIST ((integrated_datetime IS NULL));

CREATE TABLE sync_buffer_pending PARTITION OF sync_buffer FOR VALUES IN (TRUE);
CREATE TABLE sync_buffer_done    PARTITION OF sync_buffer FOR VALUES IN (FALSE);

CREATE INDEX idx_sb_query ON sync_buffer
    (table_name, operation_type, source_site_id, cursor DESC)
    WHERE integrated_datetime IS NULL;
```

### 3. `partitioned-indexed-pending-only`

LIST partitioned by `(integrated_datetime IS NULL)`; index defined **only** on
the pending partition. The query filters on `integrated_datetime IS NULL`, so
partition pruning directs it to the indexed partition at plan time — the done
partition is never scanned.

```sql
DROP TABLE IF EXISTS sync_buffer CASCADE;
CREATE TABLE sync_buffer (
    /* common columns */
) PARTITION BY LIST ((integrated_datetime IS NULL));

CREATE TABLE sync_buffer_pending PARTITION OF sync_buffer FOR VALUES IN (TRUE);
CREATE TABLE sync_buffer_done    PARTITION OF sync_buffer FOR VALUES IN (FALSE);

CREATE INDEX idx_sb_pending_query ON sync_buffer_pending
    (table_name, operation_type, source_site_id, cursor DESC)
    WHERE integrated_datetime IS NULL;
```

### 4. `partitioned-done-cursor`

LIST partitioned by `(integrated_datetime IS NULL)`; the **done** partition is
further sub-partitioned by `cursor` range. The pending partition stays small
and hot; the done partition grows across many physical tables, each covering a
cursor range. Index is defined on the parent and propagates to all partitions.

Extra scenario knob:

| Key | Meaning |
| --- | --- |
| `done_cursor_partition_size` | Cursor range per sub-partition (e.g. `"10M"`). |

Sub-partitions are pre-created up to `max_total_records + size`, plus a
`DEFAULT` partition for anything above.

```sql
DROP TABLE IF EXISTS sync_buffer CASCADE;
CREATE TABLE sync_buffer (
    /* common columns */
) PARTITION BY LIST ((integrated_datetime IS NULL));

CREATE TABLE sync_buffer_pending PARTITION OF sync_buffer FOR VALUES IN (TRUE);
CREATE TABLE sync_buffer_done PARTITION OF sync_buffer
    FOR VALUES IN (FALSE)
    PARTITION BY RANGE (cursor);

CREATE INDEX idx_sb_query ON sync_buffer
    (table_name, operation_type, source_site_id, cursor DESC)
    WHERE integrated_datetime IS NULL;

-- Pre-created sub-partitions (example with 10M cursor range, 100M max):
CREATE TABLE sync_buffer_done_c_1_10000000
    PARTITION OF sync_buffer_done FOR VALUES FROM (1) TO (10000001);
CREATE TABLE sync_buffer_done_c_10000001_20000000
    PARTITION OF sync_buffer_done FOR VALUES FROM (10000001) TO (20000001);
-- ... one per range ...
CREATE TABLE sync_buffer_done_overflow
    PARTITION OF sync_buffer_done DEFAULT;
```

## The benchmark query

All query-speed measurements run this single statement via
`EXPLAIN (ANALYZE, FORMAT JSON)` (so row serialization to the client is not
timed — only the planning + execution cost inside postgres):

```sql
SELECT *
FROM sync_buffer
WHERE integrated_datetime IS NULL
  AND table_name     = $1
  AND operation_type = $2
  AND source_site_id = $3
ORDER BY cursor DESC;
```

On partitioned scenarios the `integrated_datetime IS NULL` filter triggers
partition pruning at plan time — only `sync_buffer_pending` is touched.

## Flow of each run

For each scenario in the config (in order):

1. **Setup** — `DROP TABLE IF EXISTS sync_buffer CASCADE` then re-create the
   scenario's schema/partitions/indexes.
2. **Bench loop** — repeats until either `max_minutes_per_scenario` elapses or
   `max_total_records` is reached. Each round does:

   1. **Grow** — bulk insert `insert_between_benches` rows (single statement
      using `generate_series`, *untimed* — just populates data). Rows are
      distributed across tables and sites according to their rankings.
   2. **Insert bench** — `insert_iterations` timed inserts of
      `insert_batch_size` rows each. Each iteration writes one CSV row
      (`metric_group=insert`).
   3. **Query bench** — `query_iterations` sweeps. Each sweep runs the bench
      query for every `(table, site)` pair in `query_specs` (or all
      combinations if omitted) × both operation types (`UPSERT`, `DELETE`),
      writing one CSV row per query (`metric_group=query`).
   4. **Update bench** — one statement that integrates all pending rows
      *except* the newest `target_pending_after_bench`, by setting
      `integrated_datetime = clock_timestamp()` where
      `integrated_datetime IS NULL AND cursor <= cutoff`. One CSV row
      (`metric_group=update`).
3. The CSV is flushed after every iteration so progress is preserved even if
   the run is killed.

### CSV schema

Every row written to the results CSV has these columns:

| Column | Populated for |
| --- | --- |
| `timestamp_utc` | all |
| `scenario_name`, `scenario_type`, `bench_round`, `iteration` | all |
| `metric_group` | `insert` \| `query` \| `update` |
| `operation` | `insert_batch` \| `query_by_table_source` \| `set_integrated_true` |
| `duration_ms` | all |
| `query_execution_ms`, `query_planning_ms` | query only (from `EXPLAIN ANALYZE`) |
| `table_name`, `source_site_id`, `operation_type` | query only |
| `rows_at_bench_start` | all — size of `sync_buffer` at the start of this round |
| `total_rows_current` | all — size after this iteration |
| `rows_affected` | insert: batch size; update: rows integrated |

### Table data

The bulk insert uses a single SQL statement driven by `generate_series`, so no
row data travels over the Python↔PG wire. Rows are distributed according to
rankings (weighted round-robin):

- `table_name` cycles through a weighted list of the pre-generated UUID-based
  names (tables with higher ranking appear proportionally more often)
- `source_site_id` cycles through a weighted list of `1..N`
- `operation_type` alternates between `'UPSERT'` and `'DELETE'`
- `received_datetime` is `clock_timestamp() - (n % 600) seconds` to spread
  timestamps within a 10-minute window

## Plots

`plot_sync_buffer.py` produces one panel each for inserts, queries, and
updates:

- **Insert Throughput** — rows/second (computed from `rows_affected` and
  `duration_ms`), median across iterations in a round.
- **Query Speed** — median `duration_ms` across all query iterations in a
  round (from `EXPLAIN ANALYZE` execution time).
- **Update Speed** — `duration_ms` of the single update statement per round.

Options:

- `--log` — log-scale y-axis (helpful when query times vary by orders of
  magnitude across scenarios).
- `--output-dir` — directory for PNGs (default `plots/`).
