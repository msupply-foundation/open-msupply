---
name: sync-context
description: Load the context required to work on Open-mSupply's synchronisation system. Use this before answering any non-trivial sync question or making changes to sync code — it reads the canonical sync design docs and points at the code entry points (v5/v6/v7 transports, changelog, sync buffer, translations, sync styles). Trigger when the task touches sync, the changelog, sync_buffer, translators, or sync-style classification. To add a brand-new synced table, use the add-synced-table skill (which builds on this context).
argument-hint: "[v7|changelog|sync_buffer|translations|styles]"
---

Load the context required to work on Open-mSupply's synchronisation system.

Arguments: $ARGUMENTS (optional — a sub-area to focus on: `v7`, `changelog`, `sync_buffer`, `translations`, `styles`. If omitted, load the general overview set.)

## What this skill does

Sync in this repo spans three transports (v5, v6, v7), a changelog, a sync buffer, per-table translators, and several authoritative design docs that explain *why* the system is shaped the way it is. Before answering any non-trivial sync question or making sync code changes, read the relevant docs **and** open the code entry points they describe — the docs explain intent, the code is the source of truth.

## Step 1: Read the docs

Always read these first (they are the canonical specification, not just background):

- [docs/content/docs/sync/v7/_index.md](docs/content/docs/sync/v7/_index.md) — **the core spec.** Covers v7 design, changelog logic, source_site_id, sync-type filters, sync rules per sync style, the sync buffer, central API, pull/push examples, sanity checks, de-duplication, store/patient re-sync. Large; read it in full when working on v7 or changelog code, otherwise read the section relevant to the task.
- [docs/content/docs/sync/transition/_index.md](docs/content/docs/sync/transition/_index.md) — how v5/v6/v7 coexist; COGS / COMS / ROGS / ROMS terminology; the manual + automatic v6→v7 transition steps.
- [docs/content/docs/sync/sync_styles/_index.md](docs/content/docs/sync/sync_styles/_index.md) — **plain-English reference** for sync transports, sync styles, table-by-style lists, changelog row metadata, outgoing filters, and translation directions. Generated from code via the [sync-styles-doc skill](.claude/skills/sync-styles-doc/SKILL.md).
- [docs/content/docs/sync/adding-a-table/](docs/content/docs/sync/adding-a-table/) — guides for adding a new synced table (V7-only, or integrating an existing v5/v6 table). Also surfaced by the [add-synced-table skill](.claude/skills/add-synced-table/SKILL.md).
- [server/sync_v7_investigation/sync_buffer/sync_buffer.md](server/sync_v7_investigation/sync_buffer/sync_buffer.md) — sync_buffer shape, append-only design, partitioning recommendation, perf summary.
- [server/sync_v7_investigation/changelog/locking/locking.md](server/sync_v7_investigation/changelog/locking/locking.md) — changelog write-lock analysis (contention behaviour, why insert ordering matters).
- [server/service/src/sync/README.md](server/service/src/sync/README.md) and [docs/content/server/service/sync/_index.md](docs/content/server/service/sync/_index.md) — glossary (site, central server, transfer, record types) and stage overview (initialisation vs operational).
- [server/docs/content/docs/sync/basics.md](server/docs/content/docs/sync/basics.md), [advanced.md](server/docs/content/docs/sync/advanced.md), [api.md](server/docs/content/docs/sync/api.md), [sync-queue.md](server/docs/content/docs/sync/sync-queue.md), [change-log.md](server/docs/content/docs/sync/change-log.md) — published docs; lighter weight, use for high-level explanations.
- [server/service/src/sync/sync_status/README.md](server/service/src/sync/sync_status/README.md) — sync status / logger overview.
- [server/service/src/sync/translations/legacy_row_types.md](server/service/src/sync/translations/legacy_row_types.md) — legacy row type reference for translators.
- [server/service/src/sync/test/integration/README.md](server/service/src/sync/test/integration/README.md) — sync integration test harness.
- [decisions/2024-02-28_file_sync.md](decisions/2024-02-28_file_sync.md) — file sync design decision.
- [decisions/2024-08-30_central_sync_queue_pull_reduction.md](decisions/2024-08-30_central_sync_queue_pull_reduction.md) — central queue pull reduction decision.

Benchmark / performance reading (only when the task touches changelog or sync_buffer performance) — now under [server/sync_v7_investigation/](server/sync_v7_investigation/README.md):

- [server/sync_v7_investigation/changelog/bench/README.md](server/sync_v7_investigation/changelog/bench/README.md), [changelog/query-speed/README.md](server/sync_v7_investigation/changelog/query-speed/README.md), [changelog/locking/README.md](server/sync_v7_investigation/changelog/locking/README.md), [changelog/results/bench_summary.md](server/sync_v7_investigation/changelog/results/bench_summary.md)
- [server/sync_v7_investigation/sync_buffer/bench/README.md](server/sync_v7_investigation/sync_buffer/bench/README.md)

## Step 2: Open the code entry points

The docs reference these by purpose; here is where to find each. Read the file when the task touches that area — don't memorise from the doc alone, the code is the source of truth.

### Changelog (write side — how mutations become changelog rows)
- [server/repository/src/db_diesel/changelog/](server/repository/src/db_diesel/changelog/) — module root
- [changelog.rs](server/repository/src/db_diesel/changelog/changelog.rs) — table, row shape, the joined source query (changelog → store → transfer-stores → name-store-join → patient-stores), filter constructors
- [sync_style.rs](server/repository/src/db_diesel/changelog/sync_style.rs) — the sync-style enum and per-table classification (the authoritative mapping)
- [generate_changelog.rs](server/repository/src/db_diesel/changelog/generate_changelog.rs) — per-record-type impls that populate changelog rows (store-only / store + transfer / line-inherits-parent / patient-scoped / etc.)
- [batch_query.rs](server/repository/src/db_diesel/changelog/batch_query.rs) — v7 batch row-fetch enum (every variant is a v7-eligible table)
- [changelog_cursor_tracker.rs](server/repository/src/db_diesel/changelog/changelog_cursor_tracker.rs), [partition.rs](server/repository/src/db_diesel/changelog/partition.rs), [compatibility_changelog.rs](server/repository/src/db_diesel/changelog/compatibility_changelog.rs)
- [server/server/src/changelog_partitions.rs](server/server/src/changelog_partitions.rs) — partition management at server startup

### Sync transports
- v5 (legacy) — remote ↔ legacy 4D central
  - Push: [server/service/src/sync/remote_data_synchroniser.rs](server/service/src/sync/remote_data_synchroniser.rs)
  - Pull (central): [server/service/src/sync/central_data_synchroniser.rs](server/service/src/sync/central_data_synchroniser.rs)
  - Top-level driver: [server/service/src/sync/synchroniser.rs](server/service/src/sync/synchroniser.rs), [synchroniser_driver.rs](server/service/src/sync/synchroniser_driver.rs), [synchroniser_runner.rs](server/service/src/sync/synchroniser_runner.rs)
  - API client: [server/service/src/sync/api/](server/service/src/sync/api/)
- v6 — remote ↔ OMS central (selective, per-table-translator opt-in)
  - Pull on remote: [server/service/src/sync/central_data_synchroniser_v6.rs](server/service/src/sync/central_data_synchroniser_v6.rs)
  - Central-side pull/push handler: [server/service/src/sync/sync_on_central/mod.rs](server/service/src/sync/sync_on_central/mod.rs)
  - API client: [server/service/src/sync/api_v6/](server/service/src/sync/api_v6/)
- v7 — remote ↔ OMS central (generic JSON, blanket coverage)
  - Push from remote: [server/service/src/sync_v7/sync.rs](server/service/src/sync_v7/sync.rs)
  - Central-side pull: [server/service/src/sync_v7/sync_on_central/mod.rs](server/service/src/sync_v7/sync_on_central/mod.rs)
  - Generic serialisation: [server/service/src/sync_v7/prepare.rs](server/service/src/sync_v7/prepare.rs)
  - Driver / runner: [server/service/src/sync_v7/synchroniser.rs](server/service/src/sync_v7/synchroniser.rs), [sync_request.rs](server/service/src/sync_v7/sync_request.rs), [sync_request_runner.rs](server/service/src/sync_v7/sync_request_runner.rs)
  - Validate / translate / integrate: [server/service/src/sync_v7/validate.rs](server/service/src/sync_v7/validate.rs), [validate_translate_integrate.rs](server/service/src/sync_v7/validate_translate_integrate.rs)
  - Patient routing: [server/service/src/sync_v7/patient_lookup.rs](server/service/src/sync_v7/patient_lookup.rs)
  - API endpoints: [server/service/src/sync_v7/api/](server/service/src/sync_v7/api/) — `pull.rs`, `push.rs`, `status.rs`, `patient_data_for_site.rs`, `patient_search.rs`, `get_token.rs`
  - v7 repository layer: [server/repository/src/syncv7/](server/repository/src/syncv7/) — `sync_record.rs`, `integration_order.rs`

### Translations (per-table opt-in for v5/v6; v7 is generic)
- Trait + direction enum + defaults: [server/service/src/sync/translations/mod.rs](server/service/src/sync/translations/mod.rs)
- Per-table translators: [server/service/src/sync/translations/](server/service/src/sync/translations/) — scan for translators that override defaults to opt in/out per direction. Notable special cases: patient-name routing for `Name`, `NameStoreJoin`, `NameOmsFields`; the `*_legacy.rs` re-publishers; vaccination's patient-only routing.
- v7 has additional translators for v7-specific concerns: [server/service/src/sync_v7/translations/](server/service/src/sync_v7/translations/)

### Sync buffer (incoming-record staging)
- Repository: [server/repository/src/db_diesel/sync_buffer.rs](server/repository/src/db_diesel/sync_buffer.rs)
- Service-side processing: [server/service/src/sync/sync_buffer.rs](server/service/src/sync/sync_buffer.rs), [translation_and_integration.rs](server/service/src/sync/translation_and_integration.rs)

### Sync status & logging
- [server/service/src/sync/sync_status/](server/service/src/sync/sync_status/), [server/service/src/sync_v7/sync_status/](server/service/src/sync_v7/sync_status/), [server/service/src/sync_v7/sync_logger.rs](server/service/src/sync_v7/sync_logger.rs)

### Site auth & settings
- [server/service/src/sync/site_auth.rs](server/service/src/sync/site_auth.rs), [server/service/src/sync/settings.rs](server/service/src/sync/settings.rs)

### File sync
- [server/service/src/sync/file_synchroniser.rs](server/service/src/sync/file_synchroniser.rs), [file_sync_driver.rs](server/service/src/sync/file_sync_driver.rs)

### Tests
- v5/v6 integration: [server/service/src/sync/test/](server/service/src/sync/test/) — `pull_and_push.rs`, `merge_helpers.rs`, `integration/`, `test_data/`
- v7: [server/service/src/sync_v7/test.rs](server/service/src/sync_v7/test.rs)
- Changelog: [server/repository/src/db_diesel/changelog/test.rs](server/repository/src/db_diesel/changelog/test.rs)

## Step 3: Focus by sub-area

If `$ARGUMENTS` specifies a sub-area, prioritise these on top of the general doc set:

- **`v7`** — `docs/content/docs/sync/v7/_index.md` (full); `docs/content/docs/sync/transition/_index.md` (how v5/v6/v7 coexist and the v6→v7 migration); v7 transport code under `server/service/src/sync_v7/`; v7 repository under `server/repository/src/syncv7/`; `batch_query.rs`. Also skim the v5/v6 transport entry points listed above so you can see how the three coexist.
- **`changelog`** — `docs/content/docs/sync/v7/_index.md` (changelog sections), `docs/content/docs/sync/sync_styles/_index.md`; the entire `server/repository/src/db_diesel/changelog/` module; `changelog_partitions.rs`; bench/locking/query-speed docs under `server/sync_v7_investigation/changelog/` if perf-related.
- **`sync_buffer`** — `server/sync_v7_investigation/sync_buffer/sync_buffer.md`; `server/repository/src/db_diesel/sync_buffer.rs`; `server/service/src/sync/sync_buffer.rs`; `translation_and_integration.rs`; bench docs if perf-related.
- **`translations`** — `server/service/src/sync/translations/mod.rs` (trait + defaults); `legacy_row_types.md`; relevant per-table translator files; `server/service/src/sync_v7/translations/`.
- **`styles`** — `docs/content/docs/sync/sync_styles/_index.md`; `sync_style.rs`; `generate_changelog.rs`; the filter call sites for each transport.

## Conventions reminder

- Per [CLAUDE.md](CLAUDE.md) / [AGENT.md](AGENT.md): use `cargo nextest run`, not `cargo test`, for server tests.
- The sync code is one of the most consequential surfaces in the repo. Bugs here corrupt data on real sites. Prefer explaining what you'd change and asking before editing non-trivial sync code, especially anything that affects the changelog row shape, sync-style classification, transport filters, or translator opt-ins.
- When `sync_style.rs`, `generate_changelog.rs`, or translator opt-ins change, regenerate the plain-English doc via `/sync-styles-doc`.

## Adding a new synced table

If the task is to add a **brand-new table and make it sync** (V7 only), or to **integrate a table that already syncs in central mSupply (v5/v6) but isn't processed yet**, use the **`/add-synced-table`** skill. It builds on this context and walks through every layer (repository, migration, changelog, sync-style classification, legacy translation, V7 integration) with worked diff examples.
