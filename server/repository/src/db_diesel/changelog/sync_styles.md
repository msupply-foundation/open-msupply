# Sync styles, changelog generation, and outgoing-sync filters

This document describes how Open-mSupply decides **what records leave a site, what records arrive at a site, and over which transport**. It is descriptive — read it to understand the rules, then go to the code if you need to see them in action.

> Re-generating this document: see the bottom of the file.

---

## 1. Sync transports

A record that lands in the changelog can leave a site through one of three transports. They are not alternatives — a single record may travel on more than one of them depending on its sync style.

| Transport | Between | Wire format | Echo guard |
| --- | --- | --- | --- |
| **v5** (legacy) | remote ↔ legacy 4D mSupply central | per-table translated payload (legacy schema) | exclude rows whose source-site is the legacy central server itself |
| **v6** | remote ↔ OMS central | per-table translated payload (OMS schema), translator must opt in per direction | once a site is initialised, exclude rows whose source-site is that site |
| **v7** | remote ↔ OMS central | generic JSON of the database row, no per-table translation | push: only rows authored on this site; pull: same as v6 |

Coexistence:

- A v5 site keeps using the legacy transport, plus v6 selectively for the OMS-native tables.
- A v7 site uses only v7. v7 is a superset transport — it covers every table that has any sync style.

---

## 2. Sync styles — who is an eligible recipient

A "sync style" classifies what a changelog row *means* in routing terms. A single table may have **more than one** style at once (e.g. an invoice is `Remote + Transfer + Patient`).

| Sync style | Plain English | Recipient rule |
|---|---|---|
| **Central** | Authored centrally; everyone needs a copy. | Every site, but only when the changelog row carries no store and no patient (so hybrid tables don't double-deliver). |
| **Remote** | Site-owned data. | The site that owns the store the record belongs to. |
| **File** | Sync file references (the file blob is shipped separately). | Every site, when the row carries no store. |
| **Transfer** | Cross-store record (requisitions, invoices). | The site that owns the *other* store referenced by the record. |
| **Patient** | Patient-scoped record. | Every site that has the patient registered (via name-store-join). |
| **ToLegacyCentralOnly** | Pushed up to legacy 4D central but never re-distributed. | None on remote pulls; only flows up to legacy. |
| **RemoteToCentral** | Pushed up to OMS central but never sent back to remotes. | None — deliberately one-way so a re-init doesn't resurrect them. |

### Transport-flag per table

Every table is also tagged with a transport flag:

| Tag | Meaning |
|---|---|
| **legacy-only** | Lives on the v5 (legacy) transport. |
| **OMS-native** | Lives on the v6 transport. |
| (no v7 tag) | v7 covers every table that has any sync style. |

Filters that ask for "v6 only" pull just the OMS-native tables. Filters that ask for "v5 only" pull just the legacy-only tables. Filters that pass no transport flag (used by v7) pull every table that has any sync style.

---

## 3. Tables by sync style

The classification below mirrors what's in the code. When a table appears in two groups, both styles apply at once.

### Legacy, Remote

`ActivityLog`, `Clinician`, `ClinicianStoreJoin`, `IndicatorValue`, `InsuranceProvider`, `Location`, `LocationMovement`, `NameInsuranceJoin`, `NameStoreJoin`, `PurchaseOrder`, `PurchaseOrderLine`, `Sensor`, `StockLine`, `Stocktake`, `StocktakeLine`, `SyncMessage`, `TemperatureBreach`, `TemperatureLog`, `VVMStatusLog`

Site-owned data on the legacy transport. A remote pushes these up to legacy 4D central, which fans them back out via its own routing.

### Legacy, Remote + Transfer

`Requisition`, `RequisitionLine`

Same as above, but the changelog also records a *transfer* store, so the row can also be routed to the counterpart store on the same site.

### Legacy, Remote + Transfer + Patient

`Invoice`, `InvoiceLine`

Adds patient routing on top of remote+transfer; an invoice also follows its patient through name-store-join.

### Legacy, Central

`Abbreviation`, `Barcode`, `Category`, `Contact`, `ContactTrace`, `Context`, `Currency`, `DemographicIndicator`, `Diagnosis`, `DocumentRegistry`, `IndicatorColumn`, `IndicatorLine`, `Item`, `ItemCategoryJoin`, `ItemDirection`, `ItemStoreJoin`, `ItemWarningJoin`, `LocationType`, `MasterList`, `MasterListLine`, `MasterListNameJoin`, `NameTag`, `NameTagJoin`, `Period`, `PeriodSchedule`, `Printer`, `Program`, `ProgramEnrolment`, `ProgramEvent`, `ProgramIndicator`, `ProgramRequisitionOrderType`, `ProgramRequisitionSettings`, `ReasonOption`, `ShippingMethod`, `Store`, `StorePreference`, `Unit`, `UserAccount`, `UserPermission`, `UserStoreJoin`, `VVMStatus`

Central data still served from legacy 4D. This bucket also acts as a catch-all for tables that exist in the changelog but haven't been classified into a more specific style yet.

### Legacy + OMS-native, Central + Patient

`Name`

Names are central data — every site needs the full directory — but a patient-typed name additionally carries its own id as `patient_id` on the changelog. Non-patient names route via the Central clause; patient names route via the Patient clause to every site that knows the patient. `Name` is the only table tagged as living on **both** transports: it's pulled on v6 (so OMS-native filters include it) and still pushed on v5 (so legacy filters include it too).

### Legacy, Patient

`Document`

Pure patient-scoped data on the legacy transport. The changelog row carries only the patient, no store, so routing is purely by Patient and the record follows the patient across stores.

### Legacy, ToLegacyCentralOnly

`Site`

Pushed to legacy 4D central; never re-sent down to remotes.

### OMS-native, Central

`AssetCatalogueItem`, `AssetCatalogueType`, `AssetCategory`, `AssetClass`, `AssetLogReason`, `AssetProperty`, `BackendPlugin`, `BundledItem`, `Campaign`, `Demographic`, `FormSchema`, `FrontendPlugin`, `ItemVariant`, `NameOmsFields`, `NameProperty`, `PackagingVariant`, `Property`, `Report`, `VaccineCourse`, `VaccineCourseDose`, `VaccineCourseItem`, `VaccineCourseStoreConfig`

Authored on OMS central, fans out to every v6 site. A few of these (notably `NameOmsFields`) also allow remote → central writebacks. Some (notably the vaccine-course family) are re-published to legacy 4D so v5-only stores still receive them.

### OMS-native, Remote

`Asset`, `AssetInternalLocation`, `AssetLog`, `RnrForm`, `RnrFormLine`

Site-owned data on the OMS-native transport.

### OMS-native, Remote + Patient

`Encounter`, `Vaccination`

Store-scoped clinical records that should also follow the patient. Each row carries the authoring store *and* the patient. The Remote clause delivers it to the owning site; the Patient clause delivers it to every other site that knows the patient. The Central clause never matches because `patient_id` is set.

### OMS-native, File

`SyncFileReference`

Every site receives every reference row. The file blobs themselves are negotiated separately by the file-sync pipeline.

### OMS-native, Remote + Central (hybrid)

`PluginData`, `Preference`

If the record carries a store, it routes like Remote (the owning site only). If it doesn't, it routes like Central (every site).

### OMS-native, RemoteToCentral

`ContactForm`, `SystemLog`

Pushed up to OMS central; **not** sent back to remotes. On re-initialisation a site does not get its old contact-forms / system-logs back.

### Special — `MasterList`

`MasterList` is in the Legacy/Central bucket but its translator does not declare a changelog mapping for push, so nothing actually ships on the wire. The changelog entry exists purely so in-process processors can react to changes; legacy mSupply remains the source of truth and pushes master lists down via its own sync.

---

## 4. Changelog row metadata

Each changelog row carries a small set of metadata fields. Each filter joins through one of these fields to decide "is this row for me?".

| Field | What it means | What it's used for |
|---|---|---|
| **table_name** | Which table the row refers to. | Every filter — "table is in the set of tables I care about". |
| **record_id** | Primary key of the source row. | Used to fetch the actual record when batching. |
| **row_action** | Upsert or Delete. | Controls whether the receiver upserts or deletes. |
| **store_id** | The store this record belongs to (optional). | Remote routing (joined to the store's site). For Central / File rows this must be null, to disambiguate hybrid tables. |
| **transfer_store_id** | The "other party" store for cross-store records. | Transfer routing (joined to the counterpart store's site). |
| **patient_id** | The patient this record refers to. | Patient routing (joined via name-store-join → store → site, so any site that knows the patient receives the record). |
| **source_site_id** | The site that originally caused this changelog row. | Echo guards (don't push back to where it came from); also the v7 push filter ("rows authored here"). |

The source-site field is always populated. When a record is authored locally, it's the current site. When a record is integrated from another site, the original source is preserved. This is what powers every echo guard.

---

## 5. How records become changelog rows

When a record is mutated, a changelog row is generated. The patterns differ by what fields the changelog needs.

| Pattern | Tables (examples) | What the changelog records |
|---|---|---|
| Store + transfer-store | `Invoice`, `Requisition`, `RnrForm`, `NameStoreJoin` | The row's own store, plus the store backing a referenced name (resolved from the name's home store). Used for both Remote and Transfer routing. `Invoice` additionally tags prescriptions with the patient id so they also route via Patient. |
| Store only | `StockLine`, `Stocktake`, `Location`, `PurchaseOrder`, `Preference`, `Sensor`, `TemperatureLog`, `VVMStatusLog`, `LocationMovement`, `ActivityLog`, `ContactForm`, `Asset`, `PluginData`, `VaccineCourseStoreConfig` | Just the row's own store. |
| Line inherits parent | `InvoiceLine` ← `Invoice`, `StocktakeLine` ← `Stocktake`, `RequisitionLine` ← `Requisition`, `RnrFormLine` ← `RnrForm` | The line's changelog is built from the parent's, then `table_name` and `record_id` are overridden to point at the line. Guarantees parent and line stay aligned for store / transfer-store / patient / source-site, so they route together. |
| Line emits parent **and** child | `PurchaseOrderLine` → `PurchaseOrder` (upsert) + `PurchaseOrderLine` | Mutating a line also emits a changelog for the parent, so the parent re-syncs and is always at least as fresh as its children on the receiver. The parent entry is always an upsert, even when the line is a delete. |
| Patient + store | `Encounter`, `Vaccination` | Carries both, so the Remote clause delivers to the owning site and the Patient clause fans out to every other site that knows the patient. |
| Patient only | `Document` | The changelog row has no store; routing is purely by Patient. The record follows the patient across stores. |
| Cross-table store lookup | `AssetLog` (looks up the asset's store), `AssetInternalLocation` (looks up the location's store, falls back to the asset's store) | The record itself doesn't carry a store directly, so the generator queries a related row to find one. |
| `record_id` only | All Central-style tables (`Property`, `Demographic`, `VaccineCourse*`, `Abbreviation`, etc.) and a handful of legacy reference tables (`Clinician`, `Currency`, `Barcode`, `MasterList`, …) | No row metadata beyond table+id is needed — these tables filter purely by table name and route to everyone. |
| `record_id` only, with patient flag | `Name` | Same as `record_id` only, except that when the name's type is *patient* the changelog row also carries the name's own id as `patient_id`. Non-patient names match the Central clause (store and patient both null) and route to every site; patient names fail the Central clause and instead match the Patient clause, so they fan out to every site that knows the patient. |

For deletes, the same generator is used; only the `row_action` field changes.

---

## 6. Outgoing-sync filters

Five filters compose the metadata above into "this site, this transport" predicates.

| Filter | Used by | What it returns | Echo guard |
| --- | --- | --- | --- |
| **all-data-for-site** | v6 central pull (OMS-native tables only); v7 central pull (all tables) | Per sync style: Central / File → store-id is null **and** patient-id is null; Remote → store's site = this site; Transfer → transfer-store's site = this site; Patient → patient's site = this site (via name-store-join). ToLegacyCentralOnly and RemoteToCentral are skipped. | Once initialised, exclude rows whose source-site = this site. |
| **patient-data-for-site** | v6 patient pull and v7 patient pull (used together with an explicit patient id) | Just the Patient clause from above, intersected with the requested patient id. | None at this layer — caller composes additional conditions. |
| **all-data-for-legacy-central** | v5 push (remote → legacy 4D) | Legacy-only tables in styles ToLegacyCentralOnly, Remote, Transfer, Patient. Central, RemoteToCentral, File are excluded. | Exclude rows whose source-site is the legacy central server itself. |
| **all-data-edited-on-site** | v7 push (remote → OMS central) | Just "rows whose source-site = this site". No per-style filtering, no transport-flag filtering — the per-table translators are not consulted because v7 has no per-table translation. | Implicit — the predicate itself is the echo guard. |
| **data-for-store** | (defined, not yet used) | Remote + Transfer for a specific store, ignoring transport flags. | None. |

### Per-style behaviour inside `all-data-for-site`

| Sync style | Predicate added |
|---|---|
| Central | `store_id IS NULL AND patient_id IS NULL` (so hybrid tables only match the central half here, and rows that carry a patient never match this clause) |
| File | `store_id IS NULL AND patient_id IS NULL` |
| Remote | `store.site_id == this site` |
| Transfer | `transfer_store.site_id == this site` |
| Patient | `patient_store.site_id == this site` (via name-store-join) |
| ToLegacyCentralOnly | skipped |
| RemoteToCentral | skipped |

The filter joins changelog → store, changelog → transfer-store, changelog → name-store-join → patient-store. A row matches if any one of its applicable sync-style clauses holds.

---

## 7. Translation

For v5 and v6, a per-table translator decides which transport actually carries a row, and reshapes it for the wire. Three directions exist:

| Direction | Default |
|---|---|
| Push to legacy central | Yes, if the translator declares a changelog mapping. |
| Push to OMS central (v6) | No — must be opted in per translator. |
| Pull from OMS central (v6) | No — must be opted in per translator. |

Notable special cases:

| Table | Special behaviour |
|---|---|
| `Name`, `NameStoreJoin` | Their translators opt in to push to OMS central, so they round-trip via OMS too — used to share patient details across sites. `Name` is tagged on both transports (v5 *and* v6), so it flows over both; `NameStoreJoin` is legacy-only by transport flag but its OMS push opt-in is what enables the round-trip. When the central server is processing `Name` or `NameStoreJoin`, the translator additionally guards against echoing rows that originated from a remote (avoids the central pushing a remote-authored update straight back to legacy 4D). |
| `NameOmsFields` | Central-style (authored on OMS central) but its translator opts in to push to OMS central, allowing remote → central writebacks. |
| Vaccine-course family (`VaccineCourse`, `VaccineCourseDose`, `VaccineCourseItem`) | Central-style on OMS, but a parallel set of legacy translators re-publishes them to legacy 4D when running on OMS central, so v5-only stores still receive them. |
| `Encounter` | OMS-native, Remote + Patient. It has no main OMS translator on its own — the only translator is a companion legacy translator that re-publishes it to legacy 4D when running on OMS central, so v5-only stores still receive it. |
| `Vaccination` | OMS-native, Remote + Patient. Its main translator opts in to OMS push/pull. A companion legacy translator re-publishes it to legacy 4D when running on OMS central, so v5-only stores still receive it. |
| `Document` | Legacy-classified, Patient style — the changelog row carries no store, so routing is purely by Patient. |
| `MasterList` | Legacy/Central, but the translator declares no changelog mapping, so nothing pushes on any transport — it only ever flows down from legacy 4D. |

For v7 there is **no** per-table translation step — the database row is serialised directly and deserialised on the other side. As a consequence, v7 push for a given table works whether or not its translator has a v6 opt-in.

---

## 8. The single useful invariant

> A row reaches a site only if **both** of the following agree:
>
> 1. The sync style + transport flag say the site is an eligible recipient on this transport.
> 2. The transport-specific machinery actually carries the row — for v5/v6 that's a translator opt-in; for v7 it's blanket (any table with a sync style).

Sync style answers *who is eligible*. The transport answers *which wire format and direction*. A row only moves when both agree.

---

## How to regenerate this document

Run the slash command:

```text
/sync-styles-doc
```

(skill defined at `.claude/commands/sync-styles-doc.md`). It reads the current code and rewrites this file from scratch — useful after sync-style changes, new tables, or new translators.
