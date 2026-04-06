---
name: test-reports-cli
description: Run integration tests for standard reports using Docker containers
---

Read the skill documentation at standard_reports/test/README.md then run the integration tests for standard reports. Check standard_reports/test/temp/test-report.md for results after the run completes.

Key details:
- Tests run from `standard_reports/test/` via `cargo run`
- Config is in `standard_reports/test/config.toml`
- Each report can have a `test-config.json` at `standard_reports/<code>/test-config.json` for report-specific arguments (e.g. programId, timezone)
- Per-report `test-config.json` values take precedence over `config.toml` defaults
- Use `--workers <N>` to control parallelism (default 8, use 1 for CI)
