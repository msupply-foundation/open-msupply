# Standard Reports Integration Test

Standalone Rust binary that validates the full report pipeline using the `show-report` CLI command. Spins up a Docker container from a tagged omsupply image, builds and upserts reports, runs `show-report` for each report, and validates the HTML output.

## Prerequisites

- Docker
- Rust toolchain
- Node.js + yarn (for building reports locally)
- A seed `omsupply-database.sqlite` file in this directory
- Ensure `../test-config.json` has a valid `store_id` for the seed database.

## Running

```bash
cargo run -- --image-tag v2.17.0
```

## What it does

1. Starts a Docker container from `msupplyfoundation/omsupply:{IMAGE_TAG}`
2. Mounts the seed database and the `standard_reports/` directory into the container
3. Builds standard reports locally via `remote_server_cli build-reports`
4. Upserts reports into the container via `docker exec ./remote_server_cli upsert-reports --overwrite`
5. For each report: runs `docker exec ./remote_server_cli show-report --path <report> --config /standard_reports/`
6. Copies the generated HTML back and validates it (has `<table>`, expected column headers, no error strings)
7. Writes a markdown test report to `temp/test-report.md`
8. Prints a PASS/FAIL summary and stops the container

## CLI Options

```
OPTIONS:
    --image-tag <TAG>       Docker image tag (e.g. v2.17.0) [env: IMAGE_TAG]
    --port <PORT>           Host port mapped to container port 8000 [default: 9000]
    --skip-build            Skip the build-reports step
    --only <CODES>          Only run these reports (comma-separated codes)
    --skip <CODES>          Skip these reports (comma-separated codes)
    --output <PATH>         Write markdown test report to this file [default: temp/test-report.md]
```

## Examples

```bash
# Test all reports against a specific release
cargo run -- --image-tag v2.17.0

# Run only specific reports
cargo run -- --image-tag v2.17.0 --only stock-status,item-list

# Skip specific reports
cargo run -- --image-tag v2.17.0 --skip encounters,inbound_shipments

# Skip the build step (reuse existing generated JSON)
cargo run -- --image-tag v2.17.0 --skip-build

# Custom output path for the markdown report
cargo run -- --image-tag v2.17.0 --output results.md

# Combine options
cargo run -- --image-tag v2.17.0 --skip-build --only stock-status --port 9001
```
