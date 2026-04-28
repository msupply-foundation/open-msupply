# Changelog performance test

A simple changelog insert-rate benchmark. It measures how fast Postgres can ingest rows into the `changelog` table under different index, null-distribution, and partitioning configurations.

## How it works

For each scenario defined in the config:

1. **Reset** -- drop and recreate the benchmark database.
2. **Create table** -- create the `changelog` table (optionally partitioned by cursor range).
3. **Create indexes** -- apply the scenario's index definitions.
4. **Loop** until `bench_max_size` rows or `max_scenario_secs` elapsed:
   - **Fill** -- bulk-insert `bench_interval` rows via `generate_series` (not timed).
   - **Measure** -- insert `bench_batch_size` rows, `bench_batch_repeat` times, timing each batch.
   - **Flush** -- write all results so far to `results.json`.
5. **Chart** -- render PNG charts comparing all scenarios.

## Building

```sh
cargo build --release --bin basic_bench
```

## Running a benchmark

```sh
cargo run --release --bin basic_bench -- --config basic-config.toml
```

Results are written to `output_dir` (from config, or overridden with `-o`):
- `results.json` -- raw measurement data (flushed after every interval).
- `insert_rate.png` -- combined chart of all scenarios.
- `insert_rate_<scenario>.png` -- per-scenario chart.

## Generating charts from existing results

Re-render charts without re-running benchmarks:

```sh
# Single file
cargo run --bin basic_bench -- --generate-charts results-basic/results.json

# Combine multiple runs into one chart
cargo run --bin basic_bench -- --generate-charts run1/results.json run2/results.json

# Specify output directory
cargo run --bin basic_bench -- --generate-charts results.json -o /tmp/charts

# Use top 80% of batch rates (default 50%)
cargo run --bin basic_bench -- --generate-charts results.json --top-pct 80
```

When combining files, all measurement points are merged. Scenarios with the same name overlay on the same line; different names become separate lines. For meaningful comparison, use the same `bench_interval` and `bench_batch_size` across runs.

## CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `-c, --config` | `basic-config.toml` | Path to config file |
| `--generate-charts <file>...` | | Generate charts from existing results (skip benchmarks) |
| `-o, --output-dir` | config's `output_dir` | Override output directory |
| `--top-pct` | `50` | Average the fastest N% of batch rates per measurement point |

## Config reference

```toml
bench_interval = 500_000       # rows bulk-inserted between measurements
bench_batch_size = 10_000      # rows per timed batch
bench_batch_repeat = 10        # timed batches per interval
bench_max_size = 100_000_000   # stop after this many rows
max_scenario_minutes = 60      # optional: max wall-clock minutes per scenario
output_dir = "results-basic"

[pg]
host = "localhost"
port = 5432
user = "postgres"
password = "postgres"
database = "changelog_bench_basic"
```

### Null profiles

Control the probability of NULL for each UUID column (0.0 = always populated, 1.0 = always NULL). Referenced by name from scenarios.

```toml
[null_profiles.balanced]
store_id = 0.5
transfer_store_id = 0.5
patient_id = 0.5
```

### Scenarios

```toml
[[scenarios]]
name = "v7"
null_profile = "balanced"       # references a [null_profiles.*] entry
indexes = [
  "CREATE INDEX ... ON changelog ...;",
]
```

#### Partitioning

Add `partition_size` to enable cursor-range partitioning. The bench automatically creates partition tables as needed.

```toml
[[scenarios]]
name = "v7_partitioned"
null_profile = "balanced"
partition_size = 5_000_000      # rows per partition
indexes = [ ... ]
```

## Chart output

Each chart shows:
- **Thick solid line** -- average of the top N% fastest batch rates at each measurement point.
- **Thin semi-transparent line** -- single fastest batch rate.
- **Red dot + label** -- the lowest fastest-batch value for that scenario (i.e. worst-case peak performance).

The Y-axis is bounded by the data range (not pinned to zero) for better visibility of variation.