# Standard Reports Integration Test

Standalone Rust binary that validates the full report pipeline using `show-report`. Spins up an isolated Docker container per report in parallel, builds and upserts reports inside each container, runs `show-report`, and validates the HTML output.

## Prerequisites

- Docker
- Rust toolchain
- A seed `omsupply-database.sqlite` file in this directory

## Setup

```bash
# Copy the example config and edit it
cp config.example.toml config.toml

# Set your store_id and image_tag in config.toml, then:
cp ../../server/demo.sqlite omsupply-database.sqlite
```

## Running

```bash
cargo run -- --image-tag v2.17.0-dev
```

## What it does

1. Reads `config.toml` for defaults and per-report overrides
2. For each report, in parallel:
   - Copies the seed database to an isolated temp directory
   - Starts a Docker container (`msupplyfoundation/omsupply:{image_tag}`)
   - Builds and upserts reports inside the container
   - Runs `show-report` with per-report arguments
   - Copies the generated HTML back and validates it
   - Stops the container
3. Writes a markdown test report and prints a summary

## Config (`config.toml`)

Copy `config.example.toml` to `config.toml` and uncomment the fields you need.

All CLI flags override config values. Per-report sections override defaults for that report.

**Argument priority**: per-report `test-config.json` > CLI flags > `config.toml` defaults.

Each report can have a `test-config.json` at `standard_reports/<code>/test-config.json` with report-specific arguments and overrides. Values in `test-config.json` take precedence over `config.toml` — for example, a report can override `store_id` or `username` if it needs different credentials.

## CLI Options

```
OPTIONS:
    --image-tag <TAG>       Docker image tag [env: IMAGE_TAG]
    --port-start <PORT>     Starting port for containers [default from config: 9100]
    --database <PATH>       Path to seed database
    --skip-build            Skip the build-reports step
    --only <CODES>          Only run these reports (comma-separated)
    --skip <CODES>          Skip these reports (comma-separated)
    --config <PATH>         Path to config file [default: config.toml]
    --output <PATH>         Markdown report output path
    --workers <N>           Max parallel containers [default: 8, env: WORKERS]
```

## Examples

```bash
# Run all reports
cargo run -- --image-tag v2.17.0-dev

# Run specific reports only
cargo run -- --image-tag v2.17.0-dev --only stock-status,item-list

# Skip specific reports
cargo run -- --image-tag v2.17.0-dev --skip encounters

# Use a different database
cargo run -- --image-tag v2.17.0-dev --database /path/to/other.sqlite

# Skip build (reuse previous build inside container)
cargo run -- --image-tag v2.17.0-dev --skip-build true

# Custom config file
cargo run -- --config my-config.toml
```
