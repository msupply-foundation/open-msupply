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

```sql
-- On Postgres, wrap in a transaction (psql -c runs multi-statement as one
-- already, but BEGIN makes it explicit). On SQLite the FK enforcement is
-- off by default so order is forgiving, but the same patterns work.
BEGIN;
DELETE FROM property_v2_value  WHERE record_id LIKE 'perf_store_%';
DELETE FROM store              WHERE id LIKE 'perf_store_%';
DELETE FROM name_link          WHERE name_id LIKE 'perf_store_%';
DELETE FROM name               WHERE id LIKE 'perf_store_%';
-- Match by `property_id` rather than `id` so we catch rows that may have
-- been created with UUID ids elsewhere (e.g. sync) — anything pointing at
-- our perf properties needs to go before we can drop them.
DELETE FROM property_v2_option WHERE property_id LIKE 'perf_propv2_%' OR property_id LIKE 'perf_sparse_propv2_%';
DELETE FROM property_v2_table  WHERE property_id LIKE 'perf_propv2_%' OR property_id LIKE 'perf_sparse_propv2_%';
DELETE FROM property_v2        WHERE id LIKE 'perf_propv2_%' OR id LIKE 'perf_sparse_propv2_%';
DELETE FROM name_property      WHERE id LIKE 'perf_np_%' OR id LIKE 'perf_sparse_np_%';
DELETE FROM property           WHERE id LIKE 'perf_prop_%' OR id LIKE 'perf_sparse_prop_%';
COMMIT;
```

## Scaling sweep

`perf_sql_test.py` and `perf_plot.py` measure a *single* dataset size. To see
how each storage approach scales with the number of stores, use
`perf_scale.py` — it owns the full lifecycle (cleanup → seed dense → seed
sparse → run matrix → repeat) so each size is measured against a freshly
seeded DB.

```sh
python3 server/scripts/perf_scale.py \
    --sqlite /tmp/perf-scale.sqlite \
    --sizes 1000,10000,100000,300000,1000000
```

Both backends in one run (sweeps in series):

```sh
python3 server/scripts/perf_scale.py \
    --sqlite /tmp/perf-scale.sqlite \
    --postgres "postgresql://brian@localhost:5432/tmp" \
    --sizes 1000,10000,100000
```

Outputs:

- Per-size summary tables on stdout (same shape as `perf_sql_test.py`).
- CSV at `--csv-out` (default `/tmp/perf_scale.csv`) with one row per
  `(backend, size, op, field, method)` plus seed/cleanup timing per size.
- Log-log scaling plot at `--plot-out` (default `/tmp/perf_scale.png`): grid
  of subplots (rows = backend × op, cols = field) with one line per method.
  Plotting also lives in [perf_scale_plot.py](perf_scale_plot.py) and can
  be re-run standalone against the CSV without redoing the sweep:

  ```sh
  python3 server/scripts/perf_scale_plot.py \
      --csv /tmp/perf_scale.csv --out /tmp/perf_scale.png
  ```

  The CSV is written incrementally (one block per size, with an `fflush`
  after each), so a crash partway through still leaves all completed sizes
  on disk. If you only have the stdout log (e.g. the sweep was teed to a
  file and the CSV was clobbered), recover it with:

  ```sh
  python3 server/scripts/perf_scale_recover.py \
      --log /path/to/captured.log --out /tmp/perf_scale.csv
  ```

Flags worth knowing:

- `--skip-sparse` — drop the 30 sparse properties. Saves a *lot* of seed
  time at large N (sparse adds ~30 × N rows to `property_v2_value`).
- `--skip-indexed` — drop the functional-index pass.
- `--iterations N` — *upper bound* on samples per query (default 10). See
  `--per-case-budget-ms`.
- `--per-case-budget-ms M` — soft time budget per query case (default 1500).
  After the warmup sample, the script runs
  `min(--iterations, floor(M / warmup_ms))` timed samples (floored at 1) so
  slow cases (e.g. legacy sort at 1M ≈ 3–4s/sample) gracefully degrade to a
  single sample instead of burning 40s on 11 of them. Per-case `n=` is
  printed alongside the median.
- `--sort-shape correlated` — use the correlated-subquery sort shape the
  server currently emits, instead of the LEFT-JOIN rewrite (default).

**Heads-up on runtime.** At N=1,000,000 with sparse, total seed time can
run 20–40 min per backend and `property_v2_value` grows to ~30M rows. For
a quick sanity pass use `--sizes 1000,10000,100000 --skip-sparse`.
