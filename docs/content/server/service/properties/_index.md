+++
title = "Properties"
weight = 20
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Properties

> **Status: living document.** This is internal developer documentation for the new properties system, written to inform future work — not customer-facing. It will be expanded as the implementation progresses.

The properties system gives record kinds (starting with `name` and `item`) a binary-JSON `properties_v2` column holding key/value pairs, with definitions, options and per-table visibility configured via central tables (`property_v2`, `property_option_v2`, `property_table_v2`).

Terminology used below (see the [Sync docs](../sync) and the v7 transition notes for detail):
- **OG**: original mSupply (4D)
- **OMS**: Open mSupply
- **COMS**: OMS central server
- **ROMS**: OMS remote site
- **v5**: OG↔OMS sync
- **v6**: legacy OMS-central↔remote sync
- **v7**: the new changelog-based OMS-central↔remote sync.

## Properties Sync

There are two levels of sync that need to be sorted out with properties: sync from **OG to OMS central**, and **sync v7 to the remote sites**.

### OG → OMS central

#### Property configuration

We add the mSupply properties we want to migrate to the new properties system via a **central-only seeder defined in code**. I refer to these as **mapping properties**, as they are properties in the new system that map to mSupply properties. The seeder is idempotent and runs **only on the central server** (gated on `is_central_server()`), so the mapping property definitions exist on COMS only. Remote sites pull in new mSupply mapping properties through **sync v7**, *not* from any local setup. The safety of this between different versions is covered by the v7 sync path of properties (below). Note that modifying these OG mapping properties beyond visibility will break things, as hardcoded sync code depends on them (key, value type, etc.).

> **Why a central-only service seeder, not a migration** \
> It would be natural to seed these on DB migration, but repository-crate migrations run identically on every site and can't see `CentralServerConfig` (it lives in the service crate) — and a synced COMS only learns it's central *after* its first sync. Seeding in a migration would therefore put the definitions on every remote too, which we explicitly don't want: remotes must learn mapping properties only through v7 so version-safety lives entirely in the v7 path. So the seed runs as a **service-layer** step during the central server's sync cycle — right after sync determines the site is central, gated on `is_central_server()`. It's change-aware (no writes, no changelog churn, in steady state) and re-runs each sync, so a synced COMS picks it up on its first sync and a mapping property added in a later version is seeded on the next sync.

> **Why code, not a UI/script** \
> Some mSupply properties need custom code to turn OG data structures into properties anyway, so defining the mapping properties in code (next to that translation code) keeps them together. A script or UI for configuring them would add complexity for no real advantage. To be clear, this is about configuring the *mapping properties themselves* — a UI (shared with normal properties) for changing **visibility** is planned, just not adding / deleting / renaming or changing keys.

#### Property sync

Due to the complexity of turning some mSupply data structures into properties, this is done **custom per property** we want to migrate. Common patterns get abstractions to make things easier (e.g. `build_legacy_properties` in `translations/name.rs`, `build_legacy_item_properties` in `translations/item.rs`).

> **Why / Alternatives** \
> A generic system for everything isn't going to be possible — see item categories in mSupply. Item categories have tables for each level in OG, which just doesn't map to the new properties system generically. So it's better to do everything custom rather than trying to make the translation generic.
>
> We could have an OG-translation-type column on properties with `BASIC` or `ADVANCED`, where `BASIC` grabs the value off the sync record automatically by key and `ADVANCED` relies on custom code. But abstractions can get us most of the way there without a DB column — and since the mapping properties are tied to code through migrations anyway, it makes more sense to define the way mSupply properties are translated in code, and leave the mapping properties as only what's needed for remote v7 sites to understand what they're being sent.

### Transition gating (v3 / sync v7)

During the transition to v3 / sync v7, version-3 remote sites can still be syncing in v6/v5 mode (`SyncVersion` defaults to `V5V6`; the flip to `V7` is a handshake that can defer or fail). To make sure those remotes don't try doing their own v5 import/migration:

- **all OG → OMS paths are gated on being central** (`CentralServerConfig::is_central_server()`), and
- **everything below (the v7 paths) is gated on v7 only**.

So a V5V6 remote performs no local import and surfaces no properties; COMS is the single site that imports from OG, and v7 remotes receive everything from COMS over v7.

### Sync v7 (OMS central → remote)

#### Property configuration

This is **central only** (for now) and syncs through v7, but **not** through v5 back to OG. It must be designed with **forwards compatibility** in mind. For example, the property value type needs to be able to parse into `OTHER` for when a remote is sent a new property type it doesn't recognise (stored as `TEXT` with a `#[strum(default)] Other(String)` catch-all via the `diesel_string_enum!` helper, rather than a native DB enum that would reject the value).

The three definition tables (`property_v2`, `property_option_v2`, `property_table_v2`) are v7-only central data — they are not served over v6.

> **Why / Alternatives** \
> It doesn't make sense to sync configuration back to mSupply, as mSupply doesn't have generic enough properties.

#### Property sync

The property **values** live in ordinary columns on their host record — `name.properties_v2` and `item.properties_v2` (binary JSON: `JSONB` on Postgres, `TEXT` JSON on SQLite). They are **not** synced as separate records: they ride the host record's own changelog (`Name` / `Item`) and are served raw over v7 (no translator rewrite), reaching remotes via that record's existing sync style (Central / Patient). There is no dedicated property-value sync path.

By default the legacy mapping property values are **central-authored and flow one-way down** — COMS derives them from the OG record during its v5 import (gated on being central) and they flow out to v7 remotes via the host record. **Editable** properties (currently patient — see [Patient Properties](#patient-properties)) are the exception: edited on a remote, they flow back *up* to COMS via the host record's changelog (still v7-only, and the v5 import on COMS must merge rather than overwrite so a re-pull can't clobber the edit). Either way, values are never pushed on to OG.

Note the value rides the **whole host-record row** over v7, so concurrent edits across sites are **last-writer-wins** — there is no key-level merge on the v7 side (the merge is only on the v5 import, to protect OMS-authored keys from being clobbered by an OG re-pull).

**Forwards compatibility on read.** When a value blob is rendered, the resolver filters it to keys that are defined and visible in `property_v2` for that table. A remote therefore silently ignores values for properties it doesn't yet know about — so a newer central can start sending a value before every remote understands it, without breaking the older remote.

## Currently Implemented

### Patient Properties

Patients are `name` rows, so they reuse `name.properties_v2` and the shared legacy `custom_1/2/3` defs — but they are the first **editable** properties (the one place the one-way rule is relaxed), edited on a remote and shown in a "Custom properties" tab on the patient detail view.

- **Scope.** `custom_1/2/3` are seeded for both `name` and `patient` (`central_mapping_properties`); `PatientNode.properties_v2` filters to the `patient` scope, so patients can surface a different visible set from suppliers/facilities (which use `name`).
- **Write path.** `updatePatientPropertiesV2` patch-merges into `name.properties_v2` and emits a `Name` changelog (`NameRowRepository::update_properties_v2`); gated on `MutatePatient`.
- **Sync up.** Rides the `Name` changelog (Central + Patient) — the local edit is stamped with the site's own `source_site_id`, so it flows remote→COMS→visible remotes with no translator change.
- **Overwrite guard.** The v5 name import on COMS *merges* (`merge_legacy_properties`) instead of overwriting: it refreshes the OG-owned `custom_1/2/3` and preserves OMS-authored keys, so a v5 re-pull can't clobber a patient edit.

OG push-back is **wired but inert**: the name push derives `custom1/2/3` from `properties_v2` (`legacy_custom_field_from_properties`), but the `PushToLegacyCentral` guard (#9430, the patient-DOB round-trip bug) blocks it — so edits only reach OG if/when the general patient→OG sync path is re-enabled.

### Item Categories

Item categories are the case flagged above as *not* mapping generically. They're modelled through properties anyway — **custom**, as that section recommends — as a deliberate stress test of hierarchical, high-cardinality, externally-synced options, **in parallel to** the untouched relational `category` / `item_category_join` handling.

The fit is near 1:1 (`category.parent_id` ↔ `property_option_v2.parent_option_id`), so categories are a single OPTION property:

- **Mapping property** `legacy_item_category` (key `item_category`, OPTION, table `item`), seeded by `central_mapping_properties`.
- **Options.** `CategoryTranslation` (central-only) emits a `property_option_v2` row per `item_category*` record — `parent_ID → parent_option_id`, option `id` = category id.
- **Value.** `build_legacy_item_properties` writes the leaf `category_ID` to `item.properties_v2["item_category"]`. Since option `id` = category id, the client's `resolveOptionValue` renders the name with no client changes.

Sync is unchanged from the rules above: options are v7-only central data; the value rides the `Item` changelog; both are central-authored and one-way.

There are also two **flat** extra dimensions — `[item]category2_ID`/`category3_ID` → `item_category2`/`item_category3` (no level tables) — modelled the same way as `legacy_item_category_2`/`_3` (keys `item_category2`/`item_category3`). They emit only the option (no relational `CategoryRow`, since they aren't part of the relational `category` tree).

### Name / patient categories

`[name]`'s six independent category dimensions become six OPTION properties `legacy_name_category_1..6` (keys `name_category1..6` — prefixed since `property_v2.key` is globally unique and item already owns `category2/3`), visible on `name` and `patient`. There's no relational name-category table, so this is pure propertiesV2.

- **Options** authored by `NameCategoryTranslation` (central-only). category1 is hierarchical (`name_category1_level1`→`_level2`→`name_category1` leaf, `parent_ID → parent_option_id`); 2–6 are flat. Option `id` = category id; `build_legacy_properties` writes each leaf `categoryN_ID` to `name.properties_v2["name_categoryN"]`.
- **Editable on patients** — the first editable OPTION. `PropertyV2Input` renders OPTION as an id-aware Autocomplete of the leaf options (read-only = same control disabled). Keys are OG-owned (`LEGACY_NAME_OWNED_KEYS`), so the import/merge/last-writer-wins model matches `custom_1/2/3`.

> **`property_option_v2.parent_option_id` is deliberately not a FK.** Options sync in cursor order with no retry, so a child can arrive before its parent — a FK would silently drop it. Same reason `category.parent_id` isn't a FK.

#### Backfill via sync_buffer re-integration

Options are authored by the translators, so they only appear when a category record is processed — and central data only re-flows from OG on init or change. The migration `v3_00_00/reintegrate_categories_for_property_options` resets those records' `integration_datetime` in the append-only `sync_buffer` (for all `item_category*` and `name_category*` tables), so the next sync replays them through `CategoryTranslation` / `NameCategoryTranslation` and backfills the options — no re-init, no OG change, no edit-history dependency.
