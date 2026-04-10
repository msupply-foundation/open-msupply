# Changelog Insert Performance Benchmarks

Measures how changelog insert latency degrades as the table grows, under different PostgreSQL configurations, indexing strategies, partitioning schemes, and NULL distributions. The goal is to find the right balance of these for the sync v7 changelog table.

## Why

The changelog table is append-only and grows indefinitely. Every sync operation reads from it by cursor. Insert latency at 1M rows is very different from 10M or 20M rows, and the choice of indexes and partitioning has a direct impact. These benchmarks provide data to inform those decisions.

## Prerequisites

- **PostgreSQL 17** running locally (or accessible via env vars)
- **Rust toolchain** (stable)
- Enough disk space for seed template databases (~2GB per million rows)

### Postgres connection

Connection defaults to `localhost:5432` with `postgres/postgres` credentials and `changelog_bench` database. The `[pg]` section in `config.toml` is optional -- if omitted, these defaults are used.

Override per-machine using environment variables:

```bash
export PG_HOST=myserver
export PG_PORT=5433
export PG_USER=benchuser
export PG_PASSWORD=secret
export PG_DATABASE=my_bench_db
```

Environment variables take precedence over `config.toml` values.

## How it works

1. **Seed generation** -- For each N value, a Postgres template database is created containing the changelog table with N rows of randomized data (no indexes, 50% NULL on all three UUID columns). This is a one-time cost per N value.

2. **Per-scenario run** -- The benchmark database is created from the template using `CREATE DATABASE ... TEMPLATE` (a fast file-level copy). PG config overrides are applied if specified, indexes are built, `ANALYZE` is run, then 10,000 individual INSERTs are executed sequentially, each timed independently.

3. **Results** -- Latency percentiles (p50, p95, p99, mean, min, max) are computed and saved. Charts are generated as PNGs.

The template approach means each scenario starts from an identical data state without re-importing data.

## Running the benchmarks

From `syncdoc/content/changelog/bench/`:

```bash
# 1. Generate seed templates (required before first run)
cargo run -- --seed-only

# 2. Run all benchmarks
cargo run

# 3. Run a single phase
cargo run -- --phase 1

# 4. Run specific scenarios
cargo run -- --scenarios v7_default,v7_moderate

# 5. Run specific table sizes only
cargo run -- --n-values 1200000,3400000

# 6. Run without generating charts
cargo run -- --no-graphs

# 7. Regenerate seed templates (if changelog schema changes)
cargo run -- --reseed --seed-only
```

## What the phases test

### Phase 1 -- PostgreSQL configuration

Isolates the impact of PG server settings on insert performance. Same indexes (v7), no partitioning. Settings are applied via `ALTER SYSTEM` + `pg_reload_conf()` before each scenario and reset afterwards.

| Scenario             | Config file                      | Key difference                                         |
| -------------------- | -------------------------------- | ------------------------------------------------------ |
| `v7_default`         | `pg-configs/default.txt`         | Postgres defaults (128MB shared_buffers)               |
| `v7_moderate`        | `pg-configs/moderate.txt`        | Production-like (1GB shared_buffers, 64MB wal_buffers) |
| `v7_write_optimised` | `pg-configs/write-optimised.txt` | Same as moderate + `synchronous_commit = off`          |

### Phase 2 -- Index strategy

Isolates the cost of maintaining indexes during inserts. No PG config overrides, no partitioning. Index definitions are in `index-configs/*.sql`.

| Scenario             | Index file                         | What it creates                                                                                |
| -------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `idx_pk_only`        | `index-configs/pk_only.sql`        | Primary key only (cursor)                                                                      |
| `idx_v7`             | `index-configs/v7.sql`             | PK + 4 indexes (source_site_id, store_id, partial on transfer_store_id, partial on patient_id) |
| `idx_v7_all_partial` | `index-configs/v7_all_partial.sql` | PK + 4 partial indexes (all WHERE NOT NULL)                                                    |

### Phase 3 -- Partitioning strategy

Isolates the impact of different partitioning schemes. Same indexes (v7), no PG config overrides.

| Scenario            | Strategy                                            |
| ------------------- | --------------------------------------------------- |
| `no_partition`      | Baseline -- single table                            |
| `range_cursor_100k` | Range on cursor, 100K rows per partition            |
| `range_cursor_1m`   | Range on cursor, 1M rows per partition              |
| `range_cursor_10m`  | Range on cursor, 10M rows per partition             |
| `hash_cursor_16`    | Hash on cursor, 16 partitions                       |
| `hash_cursor_64`    | Hash on cursor, 64 partitions                       |
| `list_table_name`   | List on table_name (one partition per synced table) |

### Phase 4 -- NULL distribution impact

Compares how v7 and v7_all_partial index strategies perform as the NULL/value ratio changes for the three UUID columns (store_id, transfer_store_id, patient_id). No partitioning, no PG config overrides.

**How it works:** All scenarios reuse the same seed templates (50% NULL baseline). After copying the template, a single `UPDATE` redistributes NULLs to match the profile's percentages before indexes are created. Scenarios sharing the same null profile share a single `UPDATE` -- the loop cycles index types within the same database to avoid redundant full-table scans.

| Null profile      | store_id NULL | transfer_store_id NULL | patient_id NULL |
| ----------------- | ------------- | ---------------------- | --------------- |
| `mostly_null`     | 90%           | 90%                    | 90%             |
| `balanced`        | 50%           | 50%                    | 50%             |
| `mostly_present`  | 10%           | 10%                    | 10%             |

For each profile, both `v7` and `v7_all_partial` index configs are tested.

**Phase 4 loop structure:**
```
for each N:
  for each null_profile:
    1. Fresh DB from template
    2. UPDATE nulls to match profile (skipped for balanced -- already 50%)
    3. for each index type (v7, v7_all_partial):
       a. Create indexes → ANALYZE → Measure 10K inserts → Drop indexes
```

## Table sizes

Configured in `config.toml` under `n_values`. Default: sizes from 100K to 5.6M rows. These are the number of rows pre-populated in the table before measuring insert latency.

Larger N values take longer to seed and run. During development, use `--n-values` to test with fewer sizes.

## Output

Results are saved to `results/` with a timestamped subdirectory per phase:

- `results.json` -- raw latency stats for all scenarios in that phase
- **Phase 1 & 3**: one PNG per percentile (p50, p95, p99) -- line chart with one line per scenario, N on X-axis
- **Phase 2**: three PNGs (p50.png, p95.png, p99.png) -- grouped bar chart with N on X-axis, one bar per index strategy
- **Phase 4**: subdirectory per index type (v7/, v7_all_partial/), each with p50.png, p95.png, p99.png -- grouped bar chart with N on X-axis, one bar per null profile

A summary table is printed to the console after each phase.

## Configuration

All parameters are in `config.toml`. The `[pg]` section and `[null_profiles]` are optional.

| Setting                      | Default              | Description                                             |
| ---------------------------- | -------------------- | ------------------------------------------------------- |
| `batch_size`                 | 10,000               | Individual inserts measured per (scenario, N) pair      |
| `output_dir`                 | `results`            | Where results and charts are saved                      |
| `n_values`                   | 100K to 5.6M         | Table sizes to test                                     |
| `pg.*`                       | localhost:5432       | Postgres connection (overridable via PG_* env vars)     |
| `scenarios[].indexes`        | required             | `pk_only`, `v7`, `v7_all_partial`, or path to .sql file |
| `scenarios[].pg_config_file` | (optional)           | Path to PG settings file for ALTER SYSTEM               |
| `scenarios[].null_profile`   | (required phase 4)   | Name of a profile defined in `[null_profiles]`          |
| `null_profiles.<name>.*`     | (optional)           | NULL probabilities (0.0--1.0) for store_id, transfer_store_id, patient_id |

### Adding index strategies

Create a `.sql` file in `index-configs/` with one `CREATE INDEX` statement per line. Reference it in the scenario's `indexes` field:

```toml
[[scenarios]]
name = "my_custom_indexes"
phase = 2
indexes = "index-configs/my_custom.sql"
```

### Adding PG configurations

Create a `.txt` file in `pg-configs/` with `key = value` per line. These are applied via `ALTER SYSTEM SET` before the scenario runs.

### Adding null profiles

Define profiles in `config.toml` and reference them from phase 4 scenarios:

```toml
[null_profiles.my_profile]
store_id = 0.7
transfer_store_id = 0.7
patient_id = 0.7

[[scenarios]]
name = "my_profile_v7"
phase = 4
indexes = "index-configs/v7.sql"
null_profile = "my_profile"
```

## Not yet tested

### Delete / bloat impact

All benchmarks currently assume an append-only table with no deletes. In production, changelog rows may be deleted (e.g. pruning old entries), which introduces dead tuples and table/index bloat until VACUUM runs. This could increase insert latency beyond what these benchmarks show, particularly at high row counts where bloat accumulates.

A future phase could measure this by:

1. Deleting a percentage of rows scattered throughout the table (e.g. `DELETE WHERE cursor % 10 = 0`) to simulate pruning
2. Measuring insert performance **before** VACUUM (accumulated bloat)
3. Running `VACUUM` and measuring again (recovered state)
4. Comparing against the current no-delete baseline

### Autovacuum / VACUUM tuning

The current PG config files all use `autovacuum = on` with Postgres defaults. The fine-grained vacuum settings are not tuned:

- `autovacuum_vacuum_threshold` (default: 50 dead tuples before considering vacuum)
- `autovacuum_vacuum_scale_factor` (default: 0.2 -- vacuum triggers after 20% of rows change)
- `autovacuum_naptime` (default: 1 minute between autovacuum checks)

For a 10M row changelog table, these defaults mean autovacuum won't trigger until ~2M rows are deleted/updated. In production, vacuum behaviour depends on server-level Postgres configuration, which varies per deployment. Testing with different vacuum settings (aggressive vs lazy vs disabled) alongside the delete/bloat test above would show whether vacuum tuning matters for insert performance on this table.

## Constraints and caveats

- **Postgres must be accessible** -- the benchmark uses `CREATE DATABASE ... TEMPLATE` which requires connection to the Postgres cluster where seed templates live.
- **The `changelog_bench` database is dropped and recreated** between scenarios. Do not use a database name that matters.
- **Seed templates persist** in your Postgres instance as databases named `changelog_bench_seed_{N}`. They are not dropped automatically. Use `--reseed` to regenerate them, or drop manually.
- **PG config changes are server-wide** -- Phase 1 uses `ALTER SYSTEM` which affects all databases. Settings are reset after each scenario, but if the benchmark crashes mid-run, you may need to run `ALTER SYSTEM RESET ALL; SELECT pg_reload_conf();` manually.
- **Results vary by machine** -- disk speed, available RAM, and background load all affect latency. Results are only comparable across runs on the same machine under similar conditions.
- **Measurement is single-threaded** -- inserts are executed one at a time on a single connection. This measures per-insert overhead, not throughput under concurrency.
- **Seed data uses 50% NULL** for all three UUID columns (store_id, transfer_store_id, patient_id). Phase 4 redistributes these via UPDATE after template copy. source_site_id is always 25% populated.
