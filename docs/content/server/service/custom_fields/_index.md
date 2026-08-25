+++
title = "Custom fields"
weight = 20
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Custom fields

> **Status: living document.** This is internal developer documentation for the new custom fields system, written to inform future work — not customer-facing. It will be expanded as the implementation progresses.

The custom fields system gives record kinds a binary-JSON `custom_fields` column holding key/value pairs, with definitions, options and per-scope visibility configured via central tables (`custom_field`, `custom_field_option`, `custom_field_scope`).

Terminology used below (see the [Sync docs](../sync) and the v7 transition notes for detail):
- **OG**: original mSupply (4D)
- **OMS**: Open mSupply
- **COMS**: OMS central server
- **ROMS**: OMS remote site
- **v5**: OG↔OMS sync
- **v6**: legacy OMS-central↔remote sync
- **v7**: the new changelog-based OMS-central↔remote sync.

## Custom fields Sync

There are two levels of sync that need to be sorted out with custom fields: sync from **OG to OMS central**, and **sync v7 to the remote sites**.

### OG → OMS central

#### Custom field configuration

We add the mSupply custom fields we want to migrate to the new custom fields system via a **central-only seeder defined in code**. I refer to these as **mapping custom fields**, as they are custom fields in the new system that map to mSupply custom fields. The seeder is idempotent and runs **only on the central server** (gated on `is_central_server()`), so the mapping custom field definitions exist on COMS only. Remote sites pull in new mSupply mapping custom fields through **sync v7**, *not* from any local setup. The safety of this between different versions is covered by the v7 sync path of custom fields (below). Note that modifying these OG mapping custom fields beyond visibility will break things, as hardcoded sync code depends on them (key, value type, etc.).

> **Why a central-only service seeder, not a migration** \
> It would be natural to seed these on DB migration, but repository-crate migrations run identically on every site and can't see `CentralServerConfig` (it lives in the service crate) — and a synced COMS only learns it's central *after* its first sync. Seeding in a migration would therefore put the definitions on every remote too, which we explicitly don't want: remotes must learn mapping custom fields only through v7 so version-safety lives entirely in the v7 path. So the seed runs as a **service-layer** step during the central server's sync cycle — right after sync determines the site is central, gated on `is_central_server()`. It's change-aware (no writes, no changelog churn, in steady state) and re-runs each sync, so a synced COMS picks it up on its first sync and a mapping custom field added in a later version is seeded on the next sync.

> **Why code, not a UI/script** \
> Some mSupply custom fields need custom code to turn OG data structures into custom fields anyway, so defining the mapping custom fields in code (next to that translation code) keeps them together. A script or UI for configuring them would add complexity for no real advantage. To be clear, this is about configuring the *mapping custom fields themselves* — a UI (shared with normal custom fields) for changing **visibility** is planned, just not adding / deleting / renaming or changing keys.

#### Custom field sync

Due to the complexity of turning some mSupply data structures into custom fields, this is done **custom per custom field** we want to migrate. Common patterns get abstractions to make things easier (e.g. `build_legacy_custom_fields` in `translations/name.rs`, `build_legacy_item_custom_fields` in `translations/item.rs`).

> **Why / Alternatives** \
> A generic system for everything isn't going to be possible — see item categories in mSupply. Item categories have tables for each level in OG, which just doesn't map to the new custom fields system generically. So it's better to do everything custom rather than trying to make the translation generic.
>
> We could have an OG-translation-type column on custom fields with `BASIC` or `ADVANCED`, where `BASIC` grabs the value off the sync record automatically by key and `ADVANCED` relies on custom code. But abstractions can get us most of the way there without a DB column — and since the mapping custom fields are tied to code through migrations anyway, it makes more sense to define the way mSupply custom fields are translated in code, and leave the mapping custom fields as only what's needed for remote v7 sites to understand what they're being sent.

### Transition gating (v3 / sync v7)

During the transition to v3 / sync v7, version-3 remote sites can still be syncing in v6/v5 mode (`SyncVersion` defaults to `V5V6`; the flip to `V7` is a handshake that can defer or fail). To make sure those remotes don't try doing their own v5 import/migration:

- **all OG → OMS paths are gated on being central** (`CentralServerConfig::is_central_server()`), and
- **everything below (the v7 paths) is gated on v7 only**.

So a V5V6 remote performs no local import and surfaces no custom fields; COMS is the single site that imports from OG, and v7 remotes receive everything from COMS over v7.

### Sync v7 (OMS central → remote)

#### Custom field configuration

This is **central only** (for now) and syncs through v7, but **not** through v5 back to OG. It must be designed with **forwards compatibility** in mind. For example, the custom field value type needs to be able to parse into `OTHER` for when a remote is sent a new custom field type it doesn't recognise (stored as `TEXT` with a `#[strum(default)] Other(String)` catch-all via the `diesel_string_enum!` helper, rather than a native DB enum that would reject the value).

The three definition tables (`custom_field`, `custom_field_option`, `custom_field_scope`) are v7-only central data — they are not served over v6.

> **Why / Alternatives** \
> It doesn't make sense to sync configuration back to mSupply, as mSupply doesn't have generic enough custom fields.

#### Custom field sync

The custom field **values** live in ordinary columns on their host record — `name.custom_fields` and `item.custom_fields` (binary JSON: `JSONB` on Postgres, `TEXT` JSON on SQLite). They are **not** synced as separate records: they ride the host record's own changelog (`Name` / `Item`) and are served raw over v7 (no translator rewrite), reaching remotes via that record's existing sync style (Central / Patient). There is no dedicated custom field-value sync path.

By default the legacy mapping custom field values are **central-authored and flow one-way down** — COMS derives them from the OG record during its v5 import (gated on being central) and they flow out to v7 remotes via the host record. **Editable** custom fields (currently patient — see [Patient Custom fields](#patient-custom-fields)) are the exception: edited on a remote, they flow back *up* to COMS via the host record's changelog (still v7-only, and the v5 import on COMS must merge rather than overwrite so a re-pull can't clobber the edit). Either way, values are never pushed on to OG.

Note the value rides the **whole host-record row** over v7, so concurrent edits across sites are **last-writer-wins** — there is no key-level merge on the v7 side (the merge is only on the v5 import, to protect OMS-authored keys from being clobbered by an OG re-pull).

**Forwards compatibility on read.** When a value blob is rendered, the resolver filters it to keys that are defined and visible in `custom_field` for that table. A remote therefore silently ignores values for custom fields it doesn't yet know about — so a newer central can start sending a value before every remote understands it, without breaking the older remote.

## OMS-authored custom fields (`Builtin`)

The custom fields above all exist because OG has a field to map. `prescription_order` is the first record kind with no 4D counterpart at all. So there is a third kind: `Builtin`. It is seeded as deployment defaults. Code owns the key, value type, name and options. The deployment owns only `display_mode` - it hides what it doesn't want, and that choice survives later releases (display mode is defaulted on create only). Distribution is unchanged: central-authored, v7 to remotes, never seeded on a remote.

Seeding runs from two call sites: the sync cycle gated on `is_central_server()`, and server startup for a standalone central. A synced COMS only learns it's central after its first sync, while a standalone central never runs the sync loop at all, so neither call site alone covers both.

> **Why a new kind, and the cost** \
> `Standard` can't be told apart from the admin-configured fields a future create-UI will mint, and the seeder needs to recognise its own fields vs user ones.

## Currently Implemented

### Patient Custom fields

Patients are `name` rows, so they reuse `name.custom_fields` and the shared legacy `custom_1/2/3` defs — but they are the first **editable** custom fields (the one place the one-way rule is relaxed), edited on a remote and shown in a "Custom fields" tab on the patient detail view.

- **Scope.** Names have no single scope: `customer`/`supplier` are independent role flags (a name can be both) while `patient` is a name *type*, so the shared legacy name defs (`custom_1/2/3`, `name_category_1..6`) are seeded to all three scopes — `customer`, `supplier` and `patient` (`central_mapping_custom_fields`). `PatientNode.customFields` filters to the `patient` scope; `NameNode.customFields` filters to the **union** of the scopes the name qualifies for (`customer` if `is_customer`, `supplier` if `is_supplier`), so customers and suppliers can surface different visible sets. A name that is none of customer/supplier/patient (e.g. a manufacturer/donor/store-only name) has no scope, so its custom fields are dormant (the resolver returns an empty object).
- **Write path.** `updatePatientCustomFields` patch-merges into `name.custom_fields` and emits a `Name` changelog (`NameRowRepository::update_custom_fields`); gated on `MutatePatient`. Note this dedicated-mutation shape is patient-specific — invoice custom fields deliberately ride each type's own update mutation instead (see [Transaction categories](#transaction-categories)).
- **Sync up.** Rides the `Name` changelog (Central + Patient) — the local edit is stamped with the site's own `source_site_id`, so it flows remote→COMS→visible remotes with no translator change.
- **Overwrite guard.** The v5 name import on COMS *merges* (`merge_legacy_custom_fields`) instead of overwriting: it refreshes the OG-owned `custom_1/2/3` and preserves OMS-authored keys, so a v5 re-pull can't clobber a patient edit.

OG push-back is **wired but inert**: the name push derives `custom_1/2/3` from `custom_fields` (`legacy_value_from_custom_fields`), but the `PushToLegacyCentral` guard (#9430, the patient-DOB round-trip bug) blocks it — so edits only reach OG if/when the general patient→OG sync path is re-enabled.

### Item Categories

Item categories are the case flagged above as *not* mapping generically. They're modelled through custom fields anyway — **custom**, as that section recommends — as a deliberate stress test of hierarchical, high-cardinality, externally-synced options, **in parallel to** the untouched relational `category` / `item_category_join` handling.

The fit is near 1:1 (`category.parent_id` ↔ `custom_field_option.parent_option_id`), so categories are a single OPTION custom field:

- **Mapping custom field** key `item_category_1` (OPTION, table `item`), seeded by `central_mapping_custom_fields`.
- **Options.** `CategoryTranslation` (central-only) emits a `custom_field_option` row per `item_category*` record — `parent_ID → parent_option_id`, option `id` = category id.
- **Value.** `build_legacy_item_custom_fields` writes the leaf `category_ID` to `item.custom_fields["item_category_1"]`. Since option `id` = category id, the client's `resolveOptionValue` renders the name with no client changes.

Sync is unchanged from the rules above: options are v7-only central data; the value rides the `Item` changelog; both are central-authored and one-way.

There are also two **flat** extra dimensions — `[item]category2_ID`/`category3_ID` (no level tables) — modelled the same way under keys `item_category_2`/`item_category_3`. They emit only the option (no relational `CategoryRow`, since they aren't part of the relational `category` tree).

### Name / patient categories

`[name]`'s six independent category dimensions become six OPTION custom fields with keys `name_category_1..6` (prefixed `name_` since `custom_field.key` is globally unique — and the key is also the id — so they can't reuse item's `item_category_2/3`), visible on the `customer`, `supplier` and `patient` scopes. There's no relational name-category table, so this is pure custom fields.

- **Options** authored by `NameCategoryTranslation` (central-only). category1 is hierarchical (`name_category1_level1`→`_level2`→`name_category1` leaf, `parent_ID → parent_option_id`); 2–6 are flat. Option `id` = category id; `build_legacy_custom_fields` writes each leaf `categoryN_ID` to `name.custom_fields["name_category_N"]`.
- **Editable on patients** — the first editable OPTION. `CustomFieldInput` renders OPTION as an id-aware Autocomplete of the leaf options (read-only = same control disabled). Keys are OG-owned (`LEGACY_NAME_OWNED_KEYS`), so the import/merge/last-writer-wins model matches `custom_1/2/3`.

> **`custom_field_option.parent_option_id` is deliberately not a FK.** Options sync in cursor order with no retry, so a child can arrive before its parent — a FK would silently drop it. Same reason `category.parent_id` isn't a FK.

#### Backfill via sync_buffer re-integration

Options are authored by the translators, so they only appear when a category record is processed — and central data only re-flows from OG on init or change. The migration `v3_00_00/reintegrate_categories_for_custom_field_options` resets those records' `integration_datetime` in the append-only `sync_buffer` (for all `item_category*` and `name_category*` tables), so the next sync replays them through `CategoryTranslation` / `NameCategoryTranslation` and backfills the options — no re-init, no OG change, no edit-history dependency.

### Transaction categories

OG's `transaction_category` table is one pool of categories partitioned by a 3-char `type`. Each OMS-supported type becomes its own OPTION custom field scoped to the UI record kind.

- **Options**: authored central-only by `TransactionCategoryTranslation`, routed by `type`; **flat** — `master_category_ID` is ignored (masters are shared across types, so parents would need per-type duplicate options).
- **Value**: maps `transact.category_ID` (+ `category2_ID`) ⇄ `invoice.custom_fields` in the invoice translator; rides the `Invoice` changelog over v7. Migrations backfill historical values and replay the category records.
- **Editable** via each type's **own update mutation**. Deliberately no separate custom fields endpoint so the existing permission checks and **status gating** apply unchanged. Patch keys validate against the type's visible scope and the merge runs against the unfiltered row. This way hidden-custom field values are never clobbered. UI: a "Custom fields" tab per detail view (draft + Save, patient-tab pattern).

> **Why this deviates from the patient pattern** \
> Patients have a dedicated `updatePatientCustomFields` mutation while invoices deliberately don't. The per-type invoice update endpoints already own the full validation stack — store/type/permission checks and the status gating above — so a standalone custom fields endpoint would re-implement all of it per type. Patients have no equivalent single update service to ride (patient edits flow through the programs/document system) and no status to gate, so a dedicated mutation is the simpler shape there. Both paths share the same patch helpers (`merge_patch` / key validation in `service/src/custom_field`), so the write semantics stay identical — only the transport differs.

> **First OG push-back.** Unlike every custom field above, the categories **are pushed to OG** (`category_ID`/`category2_ID` on the v5 invoice push): invoices are *store* data OMS actively authors, so the "values are never pushed on to OG" rule is relaxed — OG reports keep seeing categories on OMS-created invoices. Only the category fields round-trip.

### Prescription order fields

The first `Builtin` set (see above) — four fields on the `prescription_order` scope, present on every deployment with no configuration:

| Key | Value type | Seeded display mode |
| --- | ---------- | ------------------- |
| `prescription_order_weight` | `Real` | `Prominent` (toolbar) |
| `prescription_order_patient_unit` | `Text` | `Prominent` (toolbar) |
| `prescription_order_patient_category` | `Option` | `Prominent` (toolbar) |
| `prescription_order_occupation` | `Text` | `Visible` (tab) |

`prescription_order_patient_category` is the patient's category: a flat vocabulary of `pregnant`, `lactating`, `under_5`, `disabled`, `destitute`, `other` (option ids are `<field_key>__<option_key>`). `other` has no free-text companion — adding one means a second field.

None of the four is read by OMS code; they're captured, displayed and printed. A value that ever feeds a calculation, a shipped report or a validation belongs in a real column instead — the JSON blob has no type enforcement and no required constraint.
