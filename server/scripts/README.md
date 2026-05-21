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

Three property definitions, mirrored across the legacy and V2 systems:

| Name | Type | Notes |
|---|---|---|
| Thoughts on beans | text | free-form string |
| Favourite Bean | option (enum) | Black / Pinto / Navy / Kidney / Lima |
| Beans | number | int `(i * 7) % 100` |

100000 stores by default (`perf_store_00001` … `perf_store_100000`), each with
all three property values populated in both systems plus the JSONB twin.

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

## Changing the dataset size

Edit the upper bound in the row-generating CTE near the middle of each script:

- SQLite: `WHERE i < 100000` in the `WITH RECURSIVE seq(i)` block.
- Postgres: `generate_series(1, 100000)` in the `WITH seq` block.

## Cleaning up

```sql
DELETE FROM property_v2_value WHERE record_id LIKE 'perf_store_%';
DELETE FROM store             WHERE id        LIKE 'perf_store_%';
DELETE FROM name_link         WHERE name_id   LIKE 'perf_store_%';
DELETE FROM name              WHERE id        LIKE 'perf_store_%';
DELETE FROM property_v2_option WHERE id LIKE 'perf_opt_bean_%';
DELETE FROM property_v2_table  WHERE id LIKE 'perf_propv2t_%';
DELETE FROM property_v2        WHERE id LIKE 'perf_propv2_%';
DELETE FROM name_property      WHERE id LIKE 'perf_np_%';
DELETE FROM property           WHERE id LIKE 'perf_prop_%';
```
