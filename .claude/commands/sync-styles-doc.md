Regenerate `server/repository/src/db_diesel/changelog/sync_styles.md` from the current state of the code.

Goal: produce a doc that explains *how Open-mSupply's sync layer routes records*, not a file/line map. A new contributor should be able to read this and understand the system without going to the code first.

Sources of truth (read these in full before writing):

- `server/repository/src/db_diesel/changelog/sync_style.rs` — `ChangeLogSyncStyle` variants, `SyncStyleOptions` (`is_v5` / `is_v6`), and the per-table classification in `ChangelogTableName::sync_style`.
- `server/repository/src/db_diesel/changelog/changelog.rs` — `ChangelogTableName`, `ChangeLogInsertRow` fields, and the `ChangelogFilter::*` constructors. Pay attention to the joined `Source` query (changelog → store → transfer_stores → name_store_join → patient_stores).
- `server/repository/src/db_diesel/changelog/generate_changelog.rs` — patterns for how a mutated record becomes a `ChangeLogInsertRow`. Group by which fields the impl populates (store_id only / store_id + transfer_store_id / line inherits parent / line emits parent + child / patient-scoped / cross-table lookup / record_id only / built from &self vs RowOrId).
- `server/repository/src/db_diesel/changelog/batch_query.rs` — `query_with_data` and the `Row` enum (only matters for v7 — every variant in `Row` is a v7-eligible table).
- `server/service/src/sync/translations/mod.rs` — `SyncTranslation`, `ToSyncRecordTranslationType`, default `should_translate_to_sync_record` behaviour.
- `server/service/src/sync/translations/*.rs` — scan for translators that override `should_translate_to_sync_record` to opt-in/out for `PushToOmSupplyCentral` / `PullFromOmSupplyCentral` / `PushToLegacyCentral`. Note any special cases (e.g. `Name`, `NameStoreJoin`, `NameOmsFields`, `*_legacy.rs` re-publishers, `Vaccination`'s patient routing).
- Filter call sites:
  - `server/service/src/sync/remote_data_synchroniser.rs` — v5 push uses `all_data_for_legacy_central`.
  - `server/service/src/sync/sync_on_central/mod.rs` — v6 central pull uses `all_data_for_site` with `is_v6: true, is_v5: false`; v6 patient pull uses `patient_data_for_site`.
  - `server/service/src/sync_v7/sync.rs` — v7 push uses `all_data_edited_on_site`.
  - `server/service/src/sync_v7/sync_on_central/mod.rs` — v7 central pull uses `all_data_for_site` with `None` (no `SyncStyleOptions` filter).
  - `server/service/src/sync_v7/prepare.rs` — confirms v7 has no per-table translation; rows are serialised generically.

Structure to preserve:

1. Sync transports (v5 / v6 / v7) — direction, filter on each side, translation step (or lack of), echo guards.
2. `ChangeLogSyncStyle` — what each variant means in routing terms; one-line summary of which filter clause each one ends up in.
3. `SyncStyleOptions` — what `is_v5` / `is_v6` narrow; why there's no `is_v7` flag.
4. Tables by sync style — exact lists, grouped to mirror `sync_style.rs`. Keep groups in source order. Mention the `MasterList` quirk (in the changelog enum but its translator has no `change_log_type()`, so nothing ships).
5. `ChangeLogInsertRow` fields and how each filter uses them — table mapping field → consumer.
6. `generate_changelog.rs` patterns — group impls by what they populate and why. Include the line-inherits-parent and line-emits-both-parent-and-child cases. Note that `source_site_id` is always populated (drives echo guards).
7. The four `ChangelogFilter` constructors — for each: who calls it, what it includes, what predicate is added per `ChangeLogSyncStyle`, what echo guard (if any). Mention `data_for_store` is currently unused.
8. Translation — the `SyncTranslation` trait, the three `ToSyncRecordTranslationType` directions, default behaviour, and the notable per-translator overrides.
9. The single useful invariant — eligibility (sync style + options) AND transport (translator opt-in or v7 blanket).
10. How to regenerate — point at this slash command.

Hard rules:

- **No line numbers.** They go stale on every refactor. Reference types, functions, and modules by name only (e.g. `ChangelogFilter::all_data_for_site`, not `changelog.rs:374`).
- **Re-derive the table lists from the code.** Do not copy them from the previous version of the doc — `ChangelogTableName::sync_style` is the source of truth.
- **Re-derive the filter behaviour from the code.** Each filter's predicate-per-sync-style table must match what `ChangelogFilter::*` actually does.
- **Cross-check translator special cases.** If a `Central`-style table also pushes to OMS central, or a `Legacy`-style table also round-trips via OMS, call it out. Read the relevant translator file rather than trusting the previous doc.
- **Optimise for "explain the system."** A reader should leave knowing why each piece exists, not just what's wired to what.
