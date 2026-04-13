# Changelog Insert Performance Benchmark

Benchmarks PostgreSQL insert performance on the changelog table under different configurations, indexing strategies, and partitioning strategies.

Related: [Issue #11086](https://github.com/msupply-foundation/open-msupply/issues/11086) | [v7 sync doc](../../v7.md#the-changelog)

## Prerequisites

- A running PostgreSQL instance (any version 14+)
- The configured PG user must have superuser privileges (needed for `ALTER SYSTEM`, `CREATE DATABASE`, template databases)

## Quick Start

```bash
# 1. Edit config.toml with your Postgres connection details
# 2. Generate seed templates (one-time, reusable across runs)
cargo run -- --seed-only

# 3. Run a specific phase
cargo run -- --phase 1
cargo run -- --phase 2
cargo run -- --phase 3

# 4. Or run everything
cargo run
```

## How It Works

### Seed Templates

Before benchmarking, the tool creates **template databases** (`changelog_bench_seed_{N}`) for each N value. These contain a non-partitioned changelog table pre-populated with N rows. Template creation is a one-time cost per N value.

Each benchmark run uses `CREATE DATABASE ... TEMPLATE ...` (a fast file-level copy) to get a fresh database with pre-populated data, then applies the scenario-specific schema on top.

### Benchmark Phases

| Phase | Tests | Variable | Controlled |
|-------|-------|----------|------------|
| **1** | PG config impact | `pg_config_file` per scenario | Same indexes, no partitioning |
| **2** | Index strategy impact | `indexes` per scenario (SQL files) | Same PG config, no partitioning |
| **3** | Partition strategy impact | `partition_file` per scenario (SQL files) | Same PG config, same indexes |
| **4** | NULL distribution impact | `null_profile` per scenario | Same PG config, no partitioning |

### Per-Scenario Flow

1. Apply PG config overrides via `ALTER SYSTEM` + `pg_reload_conf()` (if specified)
2. `CREATE DATABASE changelog_bench TEMPLATE changelog_bench_seed_{N}`
3. For partitioned scenarios: migrate data into partitioned table structure
4. Create indexes (after data load for speed)
5. `ANALYZE`
6. Measure `batch_size` individual inserts, timing each one
7. Compute p50/p95/p99 latency statistics
8. Reset PG config overrides

## Configuration

Everything is driven by `config.toml`:

```toml
batch_size = 10_000
output_dir = "results"
n_values = [1_200_000, 3_400_000, 5_600_000, 7_800_000, 10_000_000]

[pg]
host = "localhost"
port = 5432
user = "postgres"
password = "postgres"
database = "changelog_bench"

[[scenarios]]
name = "my_scenario"
phase = 2
indexes = "index-configs/v7.sql"
```

### Scenario Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique scenario name (used in output filenames) |
| `phase` | Yes | Which phase (1-4) |
| `indexes` | Yes | `"pk_only"`, `"v7"`, `"v7_all_partial"`, or path to a `.sql` file |
| `pg_config_file` | No | Path to a PG config `.txt` file (key = value per line) |
| `partition_file` | No | Path to a partition `.sql` file |
| `null_profile` | No | Name of a `[null_profiles.*]` entry (phase 4 only) |

### Adding Custom Index Strategies

Create a `.sql` file in `index-configs/` with `CREATE INDEX` statements:

```sql
-- My custom indexes
CREATE INDEX idx_foo ON changelog USING btree (store_id);
CREATE INDEX idx_bar ON changelog (patient_id) WHERE patient_id IS NOT NULL;
```

Reference it in config: `indexes = "index-configs/my_custom.sql"`

### Adding Custom Partition Strategies

Create a `.sql` file in `partition-configs/` with:
1. `CREATE TABLE ... PARTITION BY ...` (the partitioned table definition)
2. `ALTER TABLE ... ADD PRIMARY KEY ...`
3. A `@directive` comment for dynamic child partition generation

```sql
-- @range_partitions: size=500000
CREATE TABLE changelog (...) PARTITION BY RANGE (cursor);
ALTER TABLE changelog ADD PRIMARY KEY (cursor);
```

Available directives:
- `-- @range_partitions: size=N` - creates range partitions of N rows each
- `-- @hash_partitions: count=N` - creates N hash partitions
- `-- @list_partitions: key=column` - creates one partition per `TABLE_NAME_VALUES` entry

## CLI Reference

```
cargo run -- [OPTIONS]

Options:
  -c, --config <PATH>        Path to config.toml [default: config.toml]
  -p, --phase <N>            Run only phase 1, 2, 3, or 4
  -s, --scenarios <NAMES>    Run only these scenarios (comma-separated)
  -n, --n-values <VALUES>    Run only these N values (comma-separated)
      --no-graphs            Skip PNG graph generation (still saves results.json)
      --seed-only            Generate seed templates and exit
      --reseed               Drop and regenerate seed templates
  -h, --help                 Print help
```

## Output

Results are saved per-phase in timestamped directories:

```
results/
  phase1_pg_config_2026-04-10_14-30-45/
    p50.png              # lines = scenarios
    p95.png
    p99.png
    results.json
  phase2_indexes_2026-04-10_14-30-45/
    p50.png              # clustered bars: clusters = N values, bars = index strategies
    p95.png
    p99.png
    results.json
  phase3_partitioning_2026-04-10_14-30-45/
    p50.png              # lines = partition strategies
    p95.png
    p99.png
    results.json
```

## Changelog Table Schema

The benchmark uses the v7 changelog table:

| Column | Type | Nullable | Indexed |
|--------|------|----------|---------|
| `cursor` | `BIGINT` (PK, serial) | No | PK |
| `record_id` | `UUID` | No | - |
| `table_name` | `TEXT` | No | - |
| `row_action` | `ENUM (UPSERT, DELETE)` | No | - |
| `source_site_id` | `INTEGER` | Yes | btree |
| `store_id` | `UUID` | Yes | btree |
| `transfer_store_id` | `UUID` | Yes | partial btree (WHERE NOT NULL) |
| `patient_id` | `UUID` | Yes | partial btree (WHERE NOT NULL) |

## CI Builds

The workflow at `.github/workflows/build-changelog-bench.yaml` builds pre-compiled binaries (manual trigger, pick linux-x64 / windows-x64 / both). Download from the Actions tab artifacts.
