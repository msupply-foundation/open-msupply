Fixes #

# 👩🏻‍💻 What does this PR do?

Removes the standalone `report_builder` crate and consolidates all report-related functionality into the `cli` crate under `server/cli/src/report/`.

### Why

The `report_builder` crate was a separate binary/library used only by the CLI. The `cli` crate already had:
- Its own `graphql/` module with an `Api` helper (authenticated GQL queries, typename validation)
- All the surrounding infrastructure (database access, settings, logging)

Having a separate `report_builder` crate meant duplicating auth logic, using `reqwest::blocking` inside a tokio async context (requiring `spawn_blocking` workarounds), and maintaining two separate entry points for related functionality.

### Changes

**Deleted**
- `server/report_builder/` — entire crate removed
- `server/Cargo.toml` — removed `report_builder` from workspace members

**New: `server/cli/src/report/`** (mirrors structure of `server/cli/src/backup/`)
- `mod.rs` — module declarations and re-exports
- `build.rs` — `BuildArgs` struct + report definition building logic (from `report_builder/src/build.rs`)
- `print.rs` — `Format`, `Config`, `ReportGenerateData` + async report generation (from `report_builder/src/print.rs`)
- `utils.rs` — `ReportError`, `Manifest` types, `generate_report_data`, `generate_reports_recursive` (from `cli/src/report_utils.rs`)
- `actions.rs` — handler functions for all report CLI commands + `UpsertReportArgs`, `ShowReportArgs`, `TestConfig` (from `cli/src/cli.rs`)

**`server/cli/src/report/print.rs`** — now uses the existing `graphql::Api` helpers instead of manual reqwest:
- `Api::new_with_token` replaces the inline `token_request` function and its duplicated `AUTH_QUERY`
- `api.gql(query, vars, Some("PrintReportNode"))` replaces manual reqwest + manual `__typename` checking in `generate_request` — typename validation is now handled by the shared helper
- `api.gql(query, vars, None)` replaces manual reqwest in `fetch_store_id`
- `STORES_QUERY` and `PRINT_QUERY` updated to alias the top-level field as `root` to match the `Api._gql` extraction convention
- All HTTP functions converted from `reqwest::blocking` to async `reqwest`, making `generate_report_inner` a proper `async fn`

**`server/cli/src/report/actions.rs`** — all report command handlers extracted from `cli.rs`:
- `build_reports`, `upsert_reports`, `upsert_report`, `reload_embedded_reports`, `show_report` (async), `toggle_report`
- `UpsertReportArgs` (`#[derive(clap::Args)]`) — extracted from the inline `Action::UpsertReport` variant fields
- `ShowReportArgs` (`#[derive(clap::Args)]`) — extracted from the inline `Action::ShowReport` variant fields
- `TestConfig` — moved from `cli.rs`

**`server/cli/src/cli.rs`** — report commands:
- `Action::UpsertReport` and `Action::ShowReport` variants changed from inline fields to tuple style using `UpsertReportArgs` / `ShowReportArgs`
- All 6 report match arms reduced to single-line handler calls
- Removed `spawn_blocking` wrapper (was needed to allow `reqwest::blocking` inside a tokio runtime; no longer required now that `generate_report_inner` is async)
- Removed report-specific imports no longer needed in `cli.rs`: `ContextType`, `EqualFilter`, `FormSchemaRow`, `FormSchemaRowRepository`, `ReportFilter`, `ReportRepository`, `ReportRow`, `ReportRowRepository`, `schema_from_row`, `Config`, `Format`, `ReportGenerateData`, `generate_report_inner`, `generate_report_data`, `generate_reports_recursive`, `ReportError`, `OsStr`, `current_dir`, `Command`

**`server/cli/src/graphql/mod.rs`**
- `Api.url` and `Api.token` made `pub(crate)` so `fetch_file` (file download, not a GQL call) can use the token from within the `report` module

**`server/cli/Cargo.toml`**
- Removed `report_builder` dependency
- Added `regex` (workspace)

## 💌 Any notes for the reviewer?

- The `report_builder` binary (`report_builder build` / `report_builder print`) is no longer built. Its functionality is covered by the existing `remote_server_cli` commands (`build-reports`, `show-report`). If there is a need to expose `Build`/`Print` as standalone CLI subcommands they can be added to `remote_server_cli` in a follow-up.
- `fetch_file` (binary file download via `GET /files?id=...`) still uses raw `reqwest::Client` directly — there is no equivalent method on `Api` for file downloads, so this is the one place where we intentionally bypass the helper.
- The `graphql::Api` convention requires the top-level GraphQL field to be aliased as `root` — the two new queries in `print.rs` follow this convention.

# 🧪 Testing

- [ ] Run `remote_server_cli show-report --path <report_dir>` and confirm the report is generated and opened
- [ ] Run `remote_server_cli build-reports` and confirm `standard_reports.json` / `standard_forms.json` are produced correctly
- [ ] Run `remote_server_cli upsert-reports` against the generated json files
- [ ] Confirm the workspace builds without the `report_builder` crate: `cargo build -p cli`

# 📃 Documentation

- [x] **No documentation required**: internal CLI refactor, no user-facing behaviour change

# 📃 Reviewer Checklist

**Breaking Changes**
- [ ] No Breaking Changes in the Graphql API
- [ ] Technically some Breaking Changes but not expected to impact any integrations

**Issue Review**
- [ ] All requirements in original issue have been covered
- [ ] A follow up issue(s) have been created to cover additional requirements

**Tests Pass**
- [ ] Postgres
- [ ] SQLite
- [ ] Frontend
