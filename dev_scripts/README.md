# dev_scripts

Local development / testing helper scripts for open-mSupply. Safe to run against a
**local** dev database only.

## Setup

```sh
cd dev_scripts
pnpm install
```

DB connection is read automatically from `../server/configuration/local.yaml`
(the `database:` block) — no extra config needed.

## seed-stocktake-data

Bulk-seeds items + stock + a ready-to-edit stocktake, for development and for the
~5,000-line stocktake render/performance test.

```sh
pnpm seed                  # 5000 items + stock + a 5000-line stocktake (General Warehouse / GEN)
pnpm seed 10000            # custom item count
pnpm seed -- --store=GRY   # target a different store by code (note the -- before flags)
pnpm seed:clean            # remove everything the seeder created
```

Details:
- All rows use deterministic `seed-*` ids, so re-running is idempotent (`ON CONFLICT DO
  NOTHING`) and `seed:clean` removes exactly the seeded rows.
- Inserts go straight to Postgres via set-based `generate_series` (fast).
- The seeded stocktake has `counted_number_of_packs = NULL` on every line, ready for
  inline count entry.

⚠️ This server is configured as a **central server**, so seeded data can sync to connected
remote sites. Use only on an isolated local dev DB.
