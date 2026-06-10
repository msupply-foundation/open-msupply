# Perf-comparison seed scripts

Populates a dataset for benchmarking the three name-property paths exposed by
the stores list page:

1. **Legacy text JSON** — read via `json_extract(name.properties, '$.<key>')`
   (SQLite) / `(name.properties::jsonb) ->> '<key>'` (Postgres). Parses the
   TEXT column on every row.
2. **Legacy JSONB twin** — read via `json_extract(name.properties_jsonb, …)`
   / `name.properties_jsonb ->> '<key>'`. Same data, no per-row parse.
3. **Property V2 prototype** — read via the relational `property_v2_value`
   table.

## What gets seeded

Four property definitions, mirrored across the legacy and V2 systems:

| Name | Type | Notes |
|---|---|---|
| Thoughts on beans | text | free-form string |
| Favourite Bean | option (enum) | Black / Pinto / Navy / Kidney / Lima |
| Beans | number | int `(i * 7) % 100` |
| Visit date | date | `2025-01-01 + ((i - 1) % 365) days` — uniform over a year. V2 uses the typed `value_date` column; legacy stores ISO-8601 text in JSON. |

100000 stores by default (`perf_store_00001` … `perf_store_100000`), each with
all four property values populated in both systems plus the JSONB twin.

> Note: the V2 schema has no `value_datetime` column — only `value_date`
> (DATE). The visit-date property therefore exercises a date path, not
> datetime. Datetime semantics on V2 would fall back to `value_text`, which
> is already covered by the text property.

## Running

SQLite:

```sh
sqlite3 path/to/omsupply.sqlite < server/scripts/seed_perf_properties.sqlite.sql
```

Postgres:

```sh
psql "$DATABASE_URL" -f server/scripts/seed_perf_properties.postgres.sql
```

Re-running is safe — IDs are deterministic, all inserts skip on conflict, and
the `properties_jsonb` backfill is the only unconditional statement (input is
the same so the output is identical).

## Optional: 30 variably-sparse properties

To stress the V2 path under a realistic property catalog (and compare it
against legacy under the same data shape), run the sparse-seed follow-up
after the main seed completes:

SQLite:

```sh
sqlite3 path/to/omsupply.sqlite < server/scripts/seed_perf_sparse_properties.sqlite.sql
```

Postgres:

```sh
psql "$DATABASE_URL" -f server/scripts/seed_perf_sparse_properties.postgres.sql
```

What it adds:

- 30 V2 property definitions (10 text, 10 number, 5 option × 4 options each,
  5 date), id-prefixed `perf_sparse_propv2_*`.
- Per-store population at *variable* density (5%..94%, spread across the 30
  properties so different properties have wildly different fill rates).
- Mirrors the sparse keys into legacy `name.properties` / `properties_jsonb`
  so the three-way comparison sees the same data shape.

Depends on `seed_perf_properties.*` having created the `perf_store_%` rows.
Idempotent — re-running is a no-op.

## Changing the dataset size

Edit the upper bound in the row-generating CTE near the middle of each script:

- SQLite: `WHERE i < 100000` in the `WITH RECURSIVE seq(i)` block.
- Postgres: `generate_series(1, 100000)` in the `WITH seq` block.

## Cleaning up

The full cleanup block is in [cleanup_perf.sql](cleanup_perf.sql). The
Python sweep runs it before each size; you can also invoke it manually:

```sh
sqlite3 path/to/omsupply.sqlite < server/scripts/cleanup_perf.sql
psql "$DATABASE_URL" -f server/scripts/cleanup_perf.sql
```

## Running via `perf_sql_test.py`

`perf_sql_test.py` runs the legacy / legacyJsonb / V2 matrix (filter + sort
queries per field) plus a JSONB-functional-index pass. It works against
either backend (or both at once), at one size or sweeping across many,
optionally seeding the DB before each size.

### Single size, existing data (no seed)

Run against whatever's already in the DB. Useful for poking at a real dev
DB without touching its data:

```sh
python3 server/scripts/perf_sql_test.py --sqlite path/to/omsupply.sqlite
```

### Single size with seed lifecycle

Cleanup + seed 100k stores, then run the matrix:

```sh
python3 server/scripts/perf_sql_test.py \
    --sqlite /tmp/perf.sqlite \
    --sizes 100000
```

### Standalone mode (no OMS instance needed)

Add `--standalone` to use minimal per-size tables (`perf_name_<N>`,
`perf_pv2_value_<N>`) created from
[init_perf_schema.sql](init_perf_schema.sql). Works against a **fresh
blank SQLite or Postgres** — no migrations, no OMS data, no FK linkage
to worry about.

```sh
python3 server/scripts/perf_sql_test.py \
    --sqlite /tmp/perf-standalone.sqlite \
    --standalone \
    --sizes 1000,10000,100000
```

Why use it:
- **Fast re-runs.** Each per-size table is idempotently seeded on first
  use and reused thereafter — no 150s cleanup between sizes.
- **Self-contained.** Doesn't need an OMS DB; doesn't touch one if you
  have it (different table names).
- **One-time setup cost.** The 1M dense seed still takes a couple of
  minutes the first time, but only ever once per DB file.

### Multi-size sweep (scaling study)

Each size is cleaned + reseeded fresh before its matrix runs. Both backends
in one invocation if you want them measured side-by-side:

```sh
python3 server/scripts/perf_sql_test.py \
    --sqlite /tmp/perf.sqlite \
    --postgres "postgresql://postgres@localhost:5432/tmp" \
    --sizes 1000,10000,100000,300000,1000000 \
    --csv-out /tmp/perf_scale.csv \
    --plot-out /tmp/perf_scale.png
```

### Filtered runs (fast iteration on a single field/method)

```sh
# Just the v2 sort at the largest size, with the indexed pass for context:
python3 server/scripts/perf_sql_test.py --sqlite /tmp/perf.sqlite \
    --fields date \
    --methods v2,indexed

# Skip the sparse seed (saves 5–10× seed time at large N):
python3 server/scripts/perf_sql_test.py --sqlite /tmp/perf.sqlite \
    --sizes 1000000 --skip-sparse
```

### Output

- **Stdout** — per-size summary table (field rows × method columns).
- **`--csv-out`** — one row per `(backend, size, op, field, method)` plus
  seed/cleanup timing. **CSV is append-only by default** — re-running with
  the same path adds rows rather than overwriting. Delete the file first
  to start fresh.
- **`--plot-out`** — log-log scaling lines (delegates to `perf_scale_plot`).

### Plots from an existing CSV

The CSV is the source of truth. Both plot scripts read it independently —
no need to re-run measurements to tweak a plot.

```sh
# Scaling lines (x = N, lines per method):
python3 server/scripts/perf_scale_plot.py \
    --csv perf_scale.csv --out perf_scale.png --yscale log

# Per-size bars (one bar per method per field):
python3 server/scripts/perf_plot.py \
    --csv perf_scale.csv --size 100000 --out perf_bars_100k.png --cap 500
```

### Flags worth knowing

- `--iterations N` — *upper bound* on samples per query (default 10).
- `--per-case-budget-ms M` — soft time budget per query case. With this set,
  the timer runs `min(--iterations, floor(M / warmup_ms))` samples (floored
  at 1) so slow cases (e.g. legacy sort at 1M stores ≈ 3–4s/sample)
  gracefully degrade to one sample rather than burning 40s on 11. Default:
  1500ms in sweep mode, unset otherwise. Per-case `n=` is printed alongside
  the median so you can see when a case degraded.
- `--sort-shape correlated` — use the correlated-subquery sort shape the
  server currently emits, instead of the LEFT-JOIN rewrite (default).
- `--skip-sparse` — when seeding via `--sizes`, drop the 30 sparse
  properties. Saves a lot of seed time at large N.

### Runtime heads-up

At N=1,000,000 with sparse on Postgres, total seed time runs 20–40 min per
backend and `property_v2_value` grows to ~30M rows. For a quick pass use
`--sizes 1000,10000,100000 --skip-sparse`.

### Manual / debug invocation of the seed SQL

The Python scripts call `psql -f` / `sqlite3.executescript()` on the
[`seed_perf_properties.*`](seed_perf_properties.postgres.sql) files with the
store count substituted at runtime. You can also run those files directly
when debugging the SQL itself:

```sh
sqlite3 path/to/omsupply.sqlite < server/scripts/seed_perf_properties.sqlite.sql
psql "$DATABASE_URL" -f server/scripts/seed_perf_properties.postgres.sql
```

The seed counts the file's hard-coded `generate_series(1, 100000)` / `WHERE
i < 100000` bound as the default; edit it in place for direct runs.

## Insert / delete / index-build performance

`perf_sql_test.py` measures **read** latency (filter + sort). For **write**
costs — bulk insert, bulk delete, and the "add a new indexed property to a
huge existing table" case — use [`perf_insert_test.py`](perf_insert_test.py).

For each `(backend, method, N)` it runs a 6-step lifecycle against
dedicated per-method per-size tables (separate from the read-perf tables,
so it can share a DB file with `perf_sql_test.py` without disturbing
read data):

| # | Op | What it measures |
|---|---|---|
| 1 | `insert_cold` | Bulk INSERT N records into an empty, unindexed table |
| 2 | `create_index_cold` | CREATE INDEX over those N rows. The "add a new indexed property to a 100M-row `invoice_line` table" headline |
| 3 | `delete_indexed` | DELETE all rows with the extra index present |
| 4 | `insert_indexed` | Empty-but-indexed table, bulk INSERT N records (delta vs `insert_cold` ≈ per-row index maintenance) |
| 5 | `drop_index` | Mostly trivial but recorded at all sizes |
| 6 | `delete_unindexed` | DELETE all rows, no extra index |

Methods (same names as `perf_sql_test.py`):

- `legacy` — 1 INSERT per record into `properties` TEXT JSON
- `legacyJsonb` — 1 INSERT per record into `properties_jsonb`
- `v2` — 1 INSERT into a name-shaped table + 4 INSERTs into a
  `property_v2_value`-shaped table per record (full fan-out, matches the
  dense seed)

Per-method per-size tables (`perf_ins_legacy_<N>`, `perf_ins_jsonb_<N>`,
`perf_ins_v2_name_<N>`, `perf_ins_v2_value_<N>`) are dropped + recreated
at the start of each lifecycle. v2's value table carries the same three
app-level indexes the OMS schema ships with — so `insert_cold` for v2
reflects the real prod baseline, not a bare table.

### Running

```sh
# SQLite, full sweep, default sizes:
python3 server/scripts/perf_insert_test.py \
    --sqlite /tmp/perf-insert.sqlite

# Both backends, custom sizes, fresh CSV:
rm -f /tmp/perf_insert.csv
python3 server/scripts/perf_insert_test.py \
    --sqlite   /tmp/perf-insert.sqlite \
    --postgres "postgresql://postgres@localhost:5432/perf_insert" \
    --sizes    1000,10000,100000,300000,1000000 \
    --csv-out  /tmp/perf_insert.csv
```

Defaults: `--sizes 1000,10000,100000,300000,1000000`, all three methods,
`--csv-out /tmp/perf_insert_test.csv`. CSV is append-only — delete the
file to start fresh.

Filter to one method while iterating:

```sh
python3 server/scripts/perf_insert_test.py \
    --sqlite /tmp/perf-insert.sqlite \
    --sizes 100000 --methods v2
```

### Output

- **Stdout** — per-op timing as the lifecycle runs, then a summary table
  per backend (rows = N, columns = method, one table per op).
- **CSV** — one row per `(backend, size, method, op, elapsed_ms)`. Each
  op is timed once (no median-of-N), since at large N a single insert
  already takes seconds and re-running 10× would burn an hour for not
  much extra signal.

### Plots

`perf_insert_plot.py` reads the CSV and renders scaling lines (one
subplot per op, one line per method) and optionally a per-size bar
chart:

```sh
# Scaling lines (one subplot per op, log Y):
python3 server/scripts/perf_insert_plot.py \
    --csv /tmp/perf_insert.csv \
    --out /tmp/perf_insert.png

# Add a single-N bar chart (lifecycle at N=300k):
python3 server/scripts/perf_insert_plot.py \
    --csv /tmp/perf_insert.csv \
    --out /tmp/perf_insert.png \
    --bars-size 300000 \
    --bars-out  /tmp/perf_insert_bars_300k.png
```

### Runtime heads-up

v2 is roughly 7–10× the legacy/jsonb cost at every N (one name INSERT
plus 4 value INSERTs, against a value table that's already carrying 3
baseline indexes). At N=1,000,000 the full sweep against both backends
with all three methods is on the order of 10–30 min.
