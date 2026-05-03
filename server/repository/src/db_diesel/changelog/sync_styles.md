# Changelog filtering and sync styles

This document describes how the outgoing-sync query in [changelog.rs](changelog.rs) selects records for a remote site, and how each `ChangeLogSyncStyle` lines up with the per-table translators in [server/service/src/sync/translations/](../../../../../service/src/sync/translations/).

## Filtering in `create_filtered_outgoing_sync_query`

Defined at [changelog.rs:514-580](changelog.rs#L514-L580). It builds the query that picks which `changelog_deduped` rows should be sent to a given remote site during a v6 pull.

### Sync style buckets

Sync styles are declared per-table in [`ChangelogTableName::sync_style`](changelog.rs#L142-L213) and defined in [`ChangeLogSyncStyle`](changelog.rs#L130-L138):

- **`Legacy`** — goes to legacy mSupply server, never picked up here.
- **`Central`** — created on OMS central, fans out to every site.
- **`Remote`** — site-owned data; only sent to sites that own the `store_id`.
- **`File`** — sync file references; sent to all sites (handled by the `SyncFileReference` literal at [changelog.rs:564](changelog.rs#L564)).
- **`RemoteAndCentral`** — behaves Remote when `store_id` is set, Central when `store_id` is null.
- **`RemoteToCentral`** — flows site→central only; not selected here.
- **`ProcessorOnly`** — never synced, used internally.

### Filter layers applied

1. **Cursor floor** — `cursor >= earliest` from [`create_base_query`](changelog.rs#L464-L468).
2. **Skip echoes back to origin** ([changelog.rs:523-529](changelog.rs#L523-L529)) — when `is_initialized`, exclude rows whose `source_site_id` equals the requesting site (allow nulls). On initialisation this filter is skipped so the site receives the full set.
3. **Table-name OR group** ([changelog.rs:561-577](changelog.rs#L561-L577)) — a row is included if it matches any of:
   - `table_name IN central_sync_table_names` (all `Central` tables, [changelog.rs:534-536](changelog.rs#L534-L536)).
   - `table_name = SyncFileReference` (every site receives these).
   - `table_name IN remote_sync_table_names` (`Remote` + `RemoteAndCentral`, [changelog.rs:539-546](changelog.rs#L539-L546)) **AND** `store_id IN active_stores_for_site` — i.e. limited to stores whose `site_id = sync_site_id` ([changelog.rs:553-555](changelog.rs#L553-L555)).
   - `table_name IN central_by_empty_store_id` (`RemoteAndCentral` only, [changelog.rs:549-551](changelog.rs#L549-L551)) **AND** `store_id IS NULL` — the "central-like" half of `RemoteAndCentral`.
   - Special case: `table_name = Vaccination` **AND** `name_id` is a patient visible to the site via `name_store_join` ([changelog.rs:573-575](changelog.rs#L573-L575), helper at [changelog.rs:584-598](changelog.rs#L584-L598)). This bypasses the `store_id` check so vaccinations follow the patient.

The pseudo-SQL in the comment block at [changelog.rs:496-510](changelog.rs#L496-L510) is the canonical summary of this shape. Other one-off rules (like the patient-vaccination clause) are intended to slot into the same OR group.

## How records actually sync, by `ChangeLogSyncStyle`

Two layers conspire here:

1. **`ChangeLogSyncStyle`** in [changelog.rs:130-138](changelog.rs#L130-L138) decides **which remote sites** a row in the central changelog is fanned out to — it filters [`create_filtered_outgoing_sync_query`](changelog.rs#L514-L580).
2. **`SyncTranslation::should_translate_to_sync_record`** ([mod.rs:465-480](../../../../../service/src/sync/translations/mod.rs#L465-L480)) per-table at [translations/](../../../../../service/src/sync/translations/) decides **which transport** carries the row: `PushToLegacyCentral` (remote → 4D mSupply central), `PushToOmSupplyCentral` (remote → OMS central, v6 push), `PullFromOmSupplyCentral` (OMS central → remote, v6 pull, filtered by the query above).

The trait default is "push to legacy if `change_log_type()` matches; never push/pull v6 unless overridden."

### `Legacy` — the legacy mSupply backbone

`Location, LocationMovement, StockLine, Invoice, InvoiceLine, Stocktake, StocktakeLine, Requisition, RequisitionLine, ActivityLog, Barcode, Clinician, ClinicianStoreJoin, Document, Sensor, TemperatureBreach, TemperatureLog, Currency, Item, IndicatorValue, InsuranceProvider, NameInsuranceJoin, VVMStatusLog, PurchaseOrder, PurchaseOrderLine`

- Translators use trait defaults: **push to 4D legacy central** when changed; not pushed to OMS central; not selected by the v6 outgoing query (it filters out `Legacy`).
- `Name` and `NameStoreJoin` are special: legacy by classification, but their translators also override `PushToOmSupplyCentral=true` so they round-trip via OMS too (with a guard against echoing rows received from legacy).
- Effect: site ↔ 4D mSupply central; OMS central is not the source of truth.

### `Central` — created on OMS central, fanned to all sites

`BackendPlugin, AssetClass, AssetCategory, AssetCatalogueType, AssetCatalogueItem, AssetLogReason, AssetProperty, Property, NameProperty, NameOmsFields, Demographic, VaccineCourse, VaccineCourseItem, VaccineCourseDose, VaccineCourseStoreConfig, ItemVariant, PackagingVariant, BundledItem, FrontendPlugin, Report, FormSchema, Campaign`

- Selected by the v6 query for **every** site (no `store_id` predicate).
- Translators override only `PullFromOmSupplyCentral=true`; explicit `PushToLegacyCentral=false, PushToOmSupplyCentral=false` so a site can't push these back.
- Quirks worth noting:
  - `NameOmsFields` is `Central`-style but also has `PushToOmSupplyCentral=true`, allowing a site to write back to central.
  - `VaccineCourse*` have parallel `*_legacy.rs` translators that **do** push to legacy central from OMS central — so OMS central re-publishes these records to 4D for stores still on legacy sync.

### `Remote` — site-owned data

`Asset, AssetInternalLocation, AssetLog, RnrForm, RnrFormLine, Vaccination, Encounter, SyncMessage`

- v6 query only selects rows whose `store_id` belongs to a store on the requesting site ([changelog.rs:565-567](changelog.rs#L565-L567)).
- Most translators set `PushToOmSupplyCentral=true` and `PullFromOmSupplyCentral=true` — so the site pushes to OMS central, and OMS central distributes back to the owning site (and not others). `SyncMessage` is pull-only on this list (handled elsewhere).
- `Vaccination` has the patient-visibility special case in the query so it follows the patient even if the changelog row's `store_id` is on a different site.

### `RemoteAndCentral` — hybrid by `store_id`

`PluginData, Preference`

- v6 query covers both halves: `store_id IS NOT NULL` → treated like `Remote` (only owning site); `store_id IS NULL` → fanned out like `Central` (every site, see [changelog.rs:568-570](changelog.rs#L568-L570)).
- `PluginData` translator pushes both ways (`PushToOmSupplyCentral=true`, `PullFromOmSupplyCentral=true`); `Preference` is pull-only on the wire because it's only authored on central.

### `RemoteToCentral` — one-way upload to OMS central

`ContactForm, SystemLog`

- Translators override `PushToOmSupplyCentral=true` only. They are deliberately **excluded** from the v6 outgoing query (no clause matches them), so OMS central does **not** redistribute them to other sites — and crucially, on re-initialisation a site does not get its old contact-forms / system-logs back.

### `File` — sync file references

`SyncFileReference`

- v6 query has a hard-coded clause for it ([changelog.rs:564](changelog.rs#L564)): **every** site receives every reference row (the file blobs themselves are negotiated separately).
- Translator overrides both `PushToOmSupplyCentral` and `PullFromOmSupplyCentral` to `true`.

### `ProcessorOnly` — never on the wire

`MasterList`

- Not selected by any sync query and the translator does not set `change_log_type()`. The changelog entry exists purely so in-process processors can react to changes; nothing is shipped to other sites.

## Summary table

| Sync style | Site selection | Push to legacy | Push to OMS central | Pull from OMS central |
|---|---|---|---|---|
| `Legacy` | n/a (legacy transport) | yes | usually no (Name/NameStoreJoin: yes) | no |
| `Central` | all sites | no | no (NameOmsFields: yes) | yes |
| `Remote` | sites owning `store_id` (+ patient name for Vaccination) | no | yes | yes |
| `RemoteAndCentral` | owning site if `store_id` set, else all sites | no | yes (PluginData), no (Preference) | yes |
| `RemoteToCentral` | none (excluded from v6 query) | no | yes | no |
| `File` | all sites | no | yes | yes |
| `ProcessorOnly` | none | no | no | no |

The single most useful invariant: `sync_style()` chooses **which sites are eligible recipients** in the v6 pull, and the translator's `should_translate_to_sync_record` chooses **which directions on the wire** the row actually moves. A row only reaches a site if both agree.
