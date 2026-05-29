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
