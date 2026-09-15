+++
title = "Changelog filter, windowing & de-duplication"
weight = 35
sort_by = "weight"
template = "docs/section.html"
+++

# Changelog filter, windowing & de-duplication

The changelog is how V7 decides **what records to send where**. Every mutation writes a row to the `changelog` table; sync pull then queries that table, filtered to the requesting site, to assemble each batch. Because the changelog has a row for every record in the database and grows without bound, the way this query is filtered, windowed and de-duplicated is central to V7 performance.

This page describes the outgoing pull query: its routing filter, how it is windowed over the cursor, how duplicates are handled, and the full generated SQL. For where each table sits (which sync style, which routing column), see the [Sync styles reference](../sync_styles/); for the broader V7 design, the [Sync V7 spec](../v7/).

---

## Routing filter

A pull request carries the requesting site's pull cursor and `is_initialising`; authentication resolves it to a `site_id`. The central server builds a filter that selects, from cursors above the site's pull cursor, the rows that should go to that site. The filter is the OR of one branch per **distribution** (sync style), plus an anti-circular guard:

- **Central** — rows where both `store_id` and `patient_link_id` are null (so patient rows of mixed Central+Patient tables route via the Patient branch, not here).
- **Remote** — rows whose `store_id` belongs to a store active on the site (`store.site_id = site_id`).
- **RemoteOwned** — same as Remote, but only during initialisation (central never has edits to push back, so these are relayed only when hydrating a site).
- **Transfer** — rows whose `transfer_store_id` belongs to a store active on the site.
- **Patient** — rows whose `patient_link_id` resolves (via `name_store_join`) to a patient visible to a store active on the site.

Each branch is gated by `table_name IN (…)` for the tables that have that distribution, so a row is only matched by the branch(es) appropriate to its table. The whole thing is then ANDed with:

- `source_site_id != site_id` — the **anti-circular guard**: a record that arrived on central from this site is stamped with its `source_site_id`, so it is excluded when the site pulls again. Skipped during initialisation (the site legitimately wants all its historical data).
- the **cursor window** bounds (below).

The three site-membership lookups (Remote, Transfer, Patient) are expressed as correlated subqueries against `store` (and `name_store_join` for Patient), so a single query resolves all three routing paths.

> **Push** is far simpler: a site pushes the rows it authored, `source_site_id = site_id`, above its push cursor. No routing join is needed.

## Windowing

A naive `WHERE … AND cursor > pull_cursor ORDER BY cursor LIMIT n` over the whole changelog forces the planner into a bitmap scan + sort across the entire table, which degrades as the changelog grows into the hundreds of millions of rows.

Instead the query is **windowed over the cursor**: each sub-query scans at most a fixed range of cursor values (`CURSOR_WINDOW = 250_000`). The pull loop walks windows from the current cursor towards `max_cursor`, accumulating rows until it has a full batch (`limit`) or runs out of windows:

- Each window adds `cursor > window_start AND cursor < window_end + 1` to the filter, giving the planner a tight bound to drive an index scan on the changelog primary key instead of scanning the whole table.
- Rows are ordered by `cursor` ascending (the monotonic primary key) — never by datetime, which would be sensitive to clock movement.
- `max_cursor` is clamped by the in-flight cursor tracker so a reader never advances past a cursor still inside an uncommitted transaction (see [Conflict considerations](../v7/#conflict-considerations)).

The batch's `last_cursor_in_batch` becomes the site's next pull cursor.

## De-duplication

Changelog rows are **append-only** — every upsert/delete of a record adds a new row rather than updating an existing one, which keeps the write path lean. The consequence is multiple changelog rows per record (e.g. an upsert followed by a delete).

We deliberately do **not** de-duplicate on the write path. De-duplication is left to a scheduled task, and the consuming logic is built to tolerate duplicates:

1. If a changelog row references a record no longer in the database, skip it rather than erroring.
2. Counts over a filtered changelog are not reliable, so progress is reported as cursor progress toward `max_cursor`, not as an integrated count.
3. When assembling a fixed-size batch, application logic re-queries further windows until the batch is full (since skipped rows from (1) leave gaps).
4. After a remote pulls into its (also append-only) sync buffer, the buffer can hold multiple operations for the same record; only the newest pending row per `(table_name, record_id)` is applied at integration time — older rows are marked superseded. Without this, a stale delete pulled in an earlier batch than its re-create upsert would be applied after it (integration runs all upserts, then all deletes) and silently wipe the record ([#12610](https://github.com/msupply-foundation/open-msupply/issues/12610)). See also the [sync_buffer investigation](https://github.com/msupply-foundation/open-msupply/blob/develop/server/sync_v7_investigation/sync_buffer/sync_buffer.md).

Note that (4) is the *only* guard against a stale delete overwriting a newer re-create: batch assembly de-duplicates per record within a single request, but the scan window is the client's batch size, so a delete and the later re-create of the same record (same id — e.g. `user_permission`, whose ids are deterministic) can land in different batches and both be sent. Central cannot reliably filter the stale delete out either — a record deleted at the time its batch was assembled may be re-created while the same sync run is still in flight. The destination has the full picture, so de-duplication happens there.

### Scheduled de-duplication task

The scheduled task that actually prunes the table runs **on the central server, Postgres only** (it is a no-op on remote/SQLite sites, whose changelogs are small and unpartitioned). It keeps only the newest row per `(table_name, record_id, row_action)` — so the latest upsert and a delete tombstone are each preserved. Note this means a stale delete under a newer re-create upsert is **never pruned** (the key includes `row_action`); the integration-time de-duplication in (4) is what keeps such a tombstone from doing damage. The task is designed to run incrementally:

- A persisted **`ChangelogDedupCursor`** marker records how far the changelog has been de-duplicated. Each run only processes the slice added since the last run (`cursor > marker`), so the first run is the slowest (it covers the whole table) and every run after is much cheaper. A second pass cleans up the older copy of any record that re-appears across the marker boundary, so nothing is left stranded below the marker.
- Per run it builds a temporary index and a set of dead cursors (duplicates within the window, plus superseded rows below the marker for records touched in the window), then deletes them in committed batches via an index-driven `DELETE … WHERE cursor IN (…)` (using the per-partition primary key rather than scanning the whole partitioned table), then advances the marker.
- It runs on a configurable interval, optionally gated to a `time_window` (e.g. overnight) so the heavy first run lands in a quiet period. Configured via `changelog_dedup` YAML settings (interval, time_window, batch_size).

Implementation: [PR #12269](https://github.com/msupply-foundation/open-msupply/pull/12269) (fixes [#12271](https://github.com/msupply-foundation/open-msupply/issues/12271)).

## The generated SQL

The query joins `changelog` to `name_link` (to resolve `patient_id` from `patient_link_id`) and applies the routing filter. The site-membership lookups are correlated subqueries against the `store_view` and `name_store_join_view` views.

Below is the full statement for one cursor window of an `all_data_for_site` pull (illustrative: `site_id = 300`, not initialising, cursor window `0..=250000`, limit `100`). It is the SQLite form; the Postgres form is equivalent. The `table_name IN (…)` lists are populated per distribution from the current sync-style classification, so the exact set of tables shifts as tables are added or reclassified.

<details>
<summary>Full generated SQL (<code>all_data_for_site(300)</code>, one cursor window)</summary>

```sql
SELECT
  changelog.cursor,
  changelog.table_name,
  changelog.record_id,
  changelog.row_action,
  changelog.store_id,
  changelog.is_sync_update,
  changelog.source_site_id,
  changelog.transfer_store_id,
  name_link.name_id
FROM changelog
  LEFT OUTER JOIN name_link
    ON changelog.patient_link_id = name_link.id
WHERE
  (
    -- Central: central-only rows (no store, no patient)
    (
      changelog.table_name IN (
        'Abbreviation', 'AncillaryItem', 'AssetCatalogueItem', 'AssetCatalogueType',
        'AssetCategory', 'AssetClass', 'AssetLogReason', 'AssetProperty', 'BackendPlugin',
        'Barcode', 'BundledItem', 'Campaign', 'Category', 'Clinician', 'Contact', 'Context',
        'Currency', 'Demographic', 'DemographicIndicator', 'Diagnosis', 'DocumentRegistry',
        'FormSchema', 'FrontendPlugin', 'IndicatorColumn', 'IndicatorLine', 'InsuranceProvider',
        'Item', 'ItemCategoryJoin', 'ItemDirection', 'ItemVariant', 'ItemWarningJoin',
        'LocationType', 'MasterList', 'MasterListLine', 'MasterListNameJoin', 'Name',
        'NameOmsFields', 'NameProperty', 'NameTag', 'NameTagJoin', 'PackagingVariant', 'Period',
        'PeriodSchedule', 'PluginData', 'Preference', 'Printer', 'Program', 'ProgramIndicator',
        'ProgramRequisitionOrderType', 'ProgramRequisitionSettings', 'Property', 'ReasonOption',
        'Report', 'ShippingMethod', 'Store', 'StorePreference', 'SyncFileReference', 'SyncMessage',
        'Unit', 'UserAccount', 'VVMStatus', 'VaccineCourse', 'VaccineCourseDose',
        'VaccineCourseItem', 'VaccineCourseStoreConfig'
      )
      AND changelog.store_id IS NULL
      AND changelog.patient_link_id IS NULL
    )
    OR
    -- Remote: row's store is active on the site
    (
      changelog.table_name IN (
        'ActivityLog', 'Asset', 'AssetInternalLocation', 'AssetLog', 'ClinicianStoreJoin',
        'ContactTrace', 'Encounter', 'ItemStoreJoin', 'NameStoreJoin', 'PluginData', 'Preference',
        'Sensor', 'SyncMessage', 'TemperatureBreach', 'TemperatureLog', 'UserPermission',
        'UserStoreJoin', 'Vaccination'
      )
      AND changelog.store_id IS NOT NULL
      AND changelog.store_id IN (
        SELECT store_view.id FROM store_view WHERE store_view.site_id = 300
      )
    )
    OR
    -- Transfer: row's transfer_store is active on the site
    (
      changelog.table_name IN ('Invoice', 'InvoiceLine', 'Requisition', 'RequisitionLine')
      AND changelog.transfer_store_id IS NOT NULL
      AND changelog.transfer_store_id IN (
        SELECT store_view.id FROM store_view WHERE store_view.site_id = 300
      )
    )
    OR
    -- Patient: row's patient is visible to a store active on the site
    (
      changelog.table_name IN (
        'ContactTrace', 'Document', 'Encounter', 'Invoice', 'InvoiceLine', 'Name',
        'NameInsuranceJoin', 'ProgramEnrolment', 'ProgramEvent', 'Vaccination'
      )
      AND changelog.patient_link_id IS NOT NULL
      AND changelog.patient_link_id IN (
        SELECT patient_name_links.id
        FROM name_store_join_view
          INNER JOIN name_link AS patient_name_links
            ON name_store_join_view.name_id = patient_name_links.id
          INNER JOIN store_view AS patient_stores
            ON patient_stores.id = name_store_join_view.store_id
        WHERE patient_stores.site_id = 300
      )
    )
  )
  -- anti-circular guard (skipped during initialisation)
  AND changelog.source_site_id != 300
  -- cursor window
  AND changelog.cursor > 0
  AND changelog.cursor < 250001
ORDER BY changelog.cursor ASC
LIMIT 100;
```

</details>

> **Regenerating this SQL.** The statement is produced by the ignored test
> `print_all_data_for_site_query_for_site_300` in
> `server/repository/src/db_diesel/changelog/changelog.rs`. To reprint it: uncomment the
> `debug_query` line inside `ChangelogRepository::query_cursor_window`, then run
> `cargo nextest run -p repository print_all_data_for_site_query_for_site_300 --run-ignored all --no-capture`.
> The output above has been formatted and had its bind parameters inlined for readability.
