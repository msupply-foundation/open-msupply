+++
title = "Sync styles, changelog generation & outgoing filters"
weight = 50
sort_by = "weight"
template = "docs/section.html"
+++

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

## 2. The classification matrix — two axes plus transport

A table's sync style is a point on a **two-axis matrix**, because two questions are genuinely independent:

- **Authoring** — *who is allowed to create or edit this record and push it?* This gates what a receiver accepts on an incoming push — checked both when central receives a push from a remote and when a remote receives one back.
- **Distribution** — *which sites are eligible to receive this record on pull-down?* This gates which sites central sends a row to.

A table has a **set** of authoring values and a **set** of distribution values, each OR'd: an incoming push is accepted if any one authoring clause accepts it, and a row reaches a site if any one distribution clause includes it. A third, separate tag records the **transport** (legacy v5 / OMS-native v6).

The axes are independent because some records need different answers on each: a clinician is authored on remotes (central must accept its push) yet must reach every site (so it broadcasts, rather than route to one owner). No single label can say "accept remote pushes **and** broadcast" — two axes can.

### Authoring — what a receiver accepts on a push

| Value | Rule when validating an incoming push |
|---|---|
| **Central** | Central manages this record — reject any remote push. (On a remote, only a row carrying no store and no patient is accepted.) |
| **Remote** | Store-scoped, but central may also edit: accept if the row's store is active on the source site. Unlike RemoteOwned, a remote accepts these even after it has initialised. |
| **RemoteOwned** | Accept if the row's store is active on the source site (this also rejects rows that name one of central's own stores). On a remote, once initialised a row for one of our own stores is a stale echo and is rejected. |
| **Transfer** | Accept if the row names a transfer store active on the receiving site; on central, the row's own store must belong to the source site. |
| **Patient** | Accept if the row carries a patient; if it also names a store, that store must be active on the source site. |
| **Anyone** | Accept as-is, no checks. |
| **LegacyOnly** | Not a v7 record — reject. |

Because authoring is a set, a push is accepted if *any* clause accepts it. A patient-typed name, for example, is tagged `Central + Patient`: central rejects it under the `Central` clause but accepts it under the `Patient` clause, so the only name-push central accepts is a patient one.

### Distribution — who is an eligible recipient

| Value | Recipient rule |
|---|---|
| **Central** | Every site — but only when the changelog row carries no store and no patient (so hybrid and patient-typed rows don't double-deliver). |
| **Remote** | The site that owns the store the record belongs to, on **every** sync cycle. |
| **RemoteOwned** | The site that owns the store, but only while that site is **initialising** — outside initialisation central has no edits to push back. |
| **Transfer** | The site that owns the *other* store referenced by the record. |
| **Patient** | Every site where the patient is visible (via name-store-join). |
| **NotDistributed** | Never sent to a remote. |

The split between `Remote` and `RemoteOwned` is about write authority, not routing. Both styles use the same "owning site" predicate to pick a recipient. The difference shows up on the central → remote return path: for `Remote` tables central may legitimately have authored an edit on behalf of the site, so those rows are forwarded every cycle; for `RemoteOwned` tables central can't author edits, so the return path is suppressed except during initialisation (when the site needs a full snapshot to start from).

`Central` broadcasts a row when it carries no routing scope; a scoped row of a mixed table (for example a patient-typed name) is claimed by its own clause instead.

### Transport-flag per table

| Tag | Meaning |
|---|---|
| **legacy-only** | Lives on the v5 (legacy) transport. |
| **OMS-native** | Lives on the v6 transport. |
| **both** | Tagged for both v5 and v6 (only `Name`). |
| (no v7 tag) | v7 covers every table that has any sync style. |

Filters that ask for "v6 only" pull just the OMS-native tables. Filters that ask for "v5 only" pull just the legacy-only tables. Filters that pass no transport flag (used by v7) pull every table that has any sync style.

---

## 3. The matrix — every table by axis

One row per table, grouped by matrix cell (distribution-set and transport, with authoring alongside) so tables that route and validate identically sit together. Both authoring and distribution are **sets** — a push is accepted if any one authoring clause accepts it, and a row reaches a site if any one distribution clause includes it. The lists mirror the code exactly. Per-cell notes follow the table.

| Table | Authoring | Distribution | Transport |
|---|---|---|---|
| `NameStoreJoin` | Anyone | Remote | v5 |
| `ItemStoreJoin` | Anyone | Remote | v5 |
| `ClinicianStoreJoin` | Anyone | Remote | v5 |
| `ActivityLog` | RemoteOwned | Remote | v5 |
| `IndicatorValue` | RemoteOwned | RemoteOwned | v5 |
| `Location` | RemoteOwned | RemoteOwned | v5 |
| `LocationMovement` | RemoteOwned | RemoteOwned | v5 |
| `PurchaseOrder` | RemoteOwned | RemoteOwned | v5 |
| `PurchaseOrderLine` | RemoteOwned | RemoteOwned | v5 |
| `Sensor` | RemoteOwned | Remote | v5 |
| `StockLine` | RemoteOwned | RemoteOwned | v5 |
| `StockRelocation` | RemoteOwned | RemoteOwned | v5 |
| `Stocktake` | RemoteOwned | RemoteOwned | v5 |
| `StocktakeLine` | RemoteOwned | RemoteOwned | v5 |
| `TemperatureBreach` | RemoteOwned | Remote | v5 |
| `TemperatureLog` | RemoteOwned | Remote | v5 |
| `VVMStatusLog` | RemoteOwned | RemoteOwned | v5 |
| `UserPermission` | Remote | Remote | v5 |
| `UserStoreJoin` | Remote | Remote | v5 |
| `SyncMessage` | Anyone | Central + Remote | v5 |
| `Requisition` | RemoteOwned + Transfer | RemoteOwned + Transfer | v5 |
| `RequisitionLine` | RemoteOwned + Transfer | RemoteOwned + Transfer | v5 |
| `Invoice` | RemoteOwned + Transfer + Patient | RemoteOwned + Transfer + Patient | v5 |
| `InvoiceLine` | RemoteOwned + Transfer + Patient | RemoteOwned + Transfer + Patient | v5 |
| `Asset` | Anyone | Remote | v6 |
| `AssetInternalLocation` | Anyone | Remote | v6 |
| `AssetLog` | Anyone | Remote | v6 |
| `RnrForm` | RemoteOwned | RemoteOwned | v6 |
| `RnrFormLine` | RemoteOwned | RemoteOwned | v6 |
| `Encounter` | Remote + Patient | Remote + Patient | v6 |
| `Vaccination` | Remote + Patient | Remote + Patient | v6 |
| `ContactTrace` | Remote + Patient | Remote + Patient | v6 |
| `PluginData` | Central + Remote | Central + Remote | v6 |
| `Preference` | Central + Remote | Central + Remote | v6 |
| `Abbreviation` | Central | Central | v5 |
| `Barcode` | Central | Central | v5 |
| `Category` | Central | Central | v5 |
| `Contact` | Central | Central | v5 |
| `Context` | Central | Central | v5 |
| `Currency` | Central | Central | v5 |
| `DemographicIndicator` | Central | Central | v5 |
| `Diagnosis` | Central | Central | v5 |
| `DocumentRegistry` | Central | Central | v5 |
| `IndicatorColumn` | Central | Central | v5 |
| `IndicatorLine` | Central | Central | v5 |
| `InsuranceProvider` | Central | Central | v5 |
| `Item` | Central | Central | v5 |
| `ItemCategoryJoin` | Central | Central | v5 |
| `ItemDirection` | Central | Central | v5 |
| `ItemWarningJoin` | Central | Central | v5 |
| `LocationType` | Central | Central | v5 |
| `MasterList` | Central | Central | v5 |
| `MasterListLine` | Central | Central | v5 |
| `MasterListNameJoin` | Central | Central | v5 |
| `NameTag` | Central | Central | v5 |
| `NameTagJoin` | Central | Central | v5 |
| `Period` | Central | Central | v5 |
| `PeriodSchedule` | Central | Central | v5 |
| `Printer` | Central | Central | v5 |
| `Program` | Central | Central | v5 |
| `ProgramIndicator` | Central | Central | v5 |
| `ProgramRequisitionOrderType` | Central | Central | v5 |
| `ProgramRequisitionSettings` | Central | Central | v5 |
| `ReasonOption` | Central | Central | v5 |
| `ShippingMethod` | Central | Central | v5 |
| `Store` | Central | Central | v5 |
| `StorePreference` | Central | Central | v5 |
| `Unit` | Central | Central | v5 |
| `UserAccount` | Central | Central | v5 |
| `VVMStatus` | Central | Central | v5 |
| `AncillaryItem` | Central | Central | v6 |
| `AssetCatalogueItem` | Central | Central | v6 |
| `AssetCatalogueType` | Central | Central | v6 |
| `AssetCategory` | Central | Central | v6 |
| `AssetClass` | Central | Central | v6 |
| `AssetLogReason` | Central | Central | v6 |
| `AssetProperty` | Central | Central | v6 |
| `BackendPlugin` | Central | Central | v6 |
| `BundledItem` | Central | Central | v6 |
| `Campaign` | Central | Central | v6 |
| `Demographic` | Central | Central | v6 |
| `FormSchema` | Central | Central | v6 |
| `FrontendPlugin` | Central | Central | v6 |
| `HelpDocument` | Central | Central | v6 |
| `ItemVariant` | Central | Central | v6 |
| `NameOmsFields` | Central | Central | v6 |
| `NameProperty` | Central | Central | v6 |
| `PackagingVariant` | Central | Central | v6 |
| `Property` | Central | Central | v6 |
| `Report` | Central | Central | v6 |
| `VaccineCourse` | Central | Central | v6 |
| `VaccineCourseDose` | Central | Central | v6 |
| `VaccineCourseItem` | Central | Central | v6 |
| `VaccineCourseStoreConfig` | Central | Central | v6 |
| `Name` | Central + Patient | Central + Patient | v5 + v6 |
| `Document` | Patient | Patient | v5 |
| `NameInsuranceJoin` | Patient | Patient | v5 |
| `ProgramEnrolment` | Patient | Patient | v5 |
| `ProgramEvent` | Patient | Patient | v5 |
| `Clinician` | Anyone | Central | v5 |
| `SyncFileReference` | Anyone | Central | v6 |
| `ContactForm` | Anyone | NotDistributed | v6 |
| `SystemLog` | Anyone | NotDistributed | v6 |
| `Site` | LegacyOnly | NotDistributed | v5 |

### Per-cell notes

- **RemoteOwned · Remote · v5** (`ActivityLog`, `Sensor`, `TemperatureBreach`, `TemperatureLog`) — site-owned cold-chain and activity data on the legacy transport. Authored on the owning site, and distributed back to that site on **every** cycle (the `Remote` clause) rather than only at initialisation.
- **RemoteOwned · RemoteOwned · v5** (`IndicatorValue`, `Location`, `LocationMovement`, …) — site-owned data on the legacy transport. A remote pushes these up to legacy 4D central, which fans them back out via its own routing. From the OMS central perspective there is nothing to send back, so the OMS-side return path is suppressed except at initialisation.
- **RemoteOwned + Transfer · RemoteOwned + Transfer · v5** (`Requisition`, `RequisitionLine`) — site-owned plus a transfer counterpart store. The changelog records the row's own store and a *transfer* store, so the row routes to the owning site (RemoteOwned) and to the counterpart site (Transfer); a push is accepted from whichever site owns either store.
- **RemoteOwned + Transfer + Patient · RemoteOwned + Transfer + Patient · v5** (`Invoice`, `InvoiceLine`) — adds patient routing on top of RemoteOwned+Transfer; an invoice also follows its patient (prescriptions only) through name-store-join.
- **RemoteOwned · RemoteOwned · v6** (`RnrForm`, `RnrFormLine`) — site-owned data on the OMS-native transport. Central does not author edits; the return path is suppressed except at initialisation.
- **Remote + Patient · Remote + Patient · v6** (`Encounter`, `Vaccination`, `ContactTrace`) — store-scoped clinical records that should also follow the patient. Each row carries the authoring store *and* the patient. The `Remote` clause delivers it to the owning site; the `Patient` clause delivers it to every other site that knows the patient. Authoring is `Remote` (not `RemoteOwned`): the owning site keeps accepting updates even after it has initialised.
- **Remote · Remote · v5** (`UserPermission`, `UserStoreJoin`) — store-scoped user-access data on the legacy transport. The owning remote site may author and push changes — central accepts a push when the row's store is active on the source site — and central may also edit them. Each row routes only to the site that owns the referenced store, and on **every** cycle (the `Remote` distribution clause, not `RemoteOwned`) precisely because central legitimately authors edits to push back. In practice `UserStoreJoin` is authored on central (it originates from legacy 4D's `user_store` table); the `Remote` authoring clause simply means central would also accept a push from the owning site rather than rejecting it.
- **Central · Central · v5** (`Abbreviation`, `Barcode`, …) — central data still served from legacy 4D. This bucket also acts as a catch-all for tables that exist in the changelog but haven't been classified into a more specific cell yet.
- **Central · Central · v6** (`AncillaryItem`, `AssetCatalogueItem`, …) — authored on OMS central, fans out to every v6 site. A few of these (notably `NameOmsFields`) also allow remote → central writebacks. Some (notably the vaccine-course family) are re-published to legacy 4D so v5-only stores still receive them (see §7).
- **Central + Remote · Central + Remote · v6** (`PluginData`, `Preference`) — store-or-global data on the OMS-native transport. If the record carries a store it routes to the owning site (the Remote clause); if it doesn't it broadcasts to every site (the Central clause). Authoring is `Central + Remote`, so both central and the owning site may edit.
- **Central + Patient · Central + Patient · v5 + v6** (`Name`) — names are central data — every site needs the full directory — but a patient-typed name additionally carries its own id as the patient on the changelog. Non-patient names route via the broadcast (`Central`) clause; patient names route via the `Patient` clause to every site that knows the patient. On central the `Central` authoring clause rejects and only the `Patient` clause accepts, so the only name-push central accepts is a patient name. `Name` is the only table tagged for **both** transports.
- **Patient · Patient · v5** (`Document`, `NameInsuranceJoin`, `ProgramEnrolment`, `ProgramEvent`) — pure patient-scoped data on the legacy transport. The changelog row carries only the patient, no store, so routing is purely by Patient and the record follows the patient across stores.
- **Anyone · Remote · v5** (`NameStoreJoin`, `ItemStoreJoin`, `ClinicianStoreJoin`) — store-scoped join tables that central accepts from any pusher (no authoring checks) and routes to the owning site on every cycle. `NameStoreJoin` in particular is rewritten on central whenever a name's patient visibility changes, or whenever the customer/supplier flag on a name flips (which cascades across every site's join row for that name); because central authors those edits, the return path is on every cycle.
- **Anyone · Remote · v6** (`Asset`, `AssetInternalLocation`, `AssetLog`) — asset data on the OMS-native transport, accepted from any pusher and routed to the owning site on every cycle. `AssetLog` and `AssetInternalLocation` don't carry a store directly, so the changelog generator looks one up from a related row (see §5).
- **Anyone · Central · v5** (`Clinician`) — remote-authored data that broadcasts to every site. The changelog row is keyless — no store, no patient — so it matches the broadcast predicate; the clinician's own store travels in the record data, where store-join and invoice foreign keys still resolve it.
- **Anyone · Central · v6** (`SyncFileReference`) — every site receives every reference row. The file blobs themselves are negotiated separately by the file-sync pipeline.
- **Anyone · Central + Remote · v5** (`SyncMessage`) — accepted from any pusher, with a broadcast clause plus a Remote clause. The changelog `store_id` is populated from the message's destination store, so the routing matches `PluginData` / `Preference`: with a destination store only the owning site receives the message; without one it fans out to every site. Used to ship cross-site instructions like name/item/clinician merges from OMS central down to v7 remotes (see §7).
- **Anyone · NotDistributed · v6** (`ContactForm`, `SystemLog`) — pushed up to OMS central; **not** sent back to remotes. On re-initialisation a site does not get its old contact-forms / system-logs back.
- **LegacyOnly · NotDistributed · v5** (`Site`) — pushed to legacy 4D central; never re-sent down to remotes, and never a valid v7 record.

### Special — `MasterList`

`MasterList` is in the Central/Central/v5 bucket, but its translator does not declare a changelog mapping for push, so nothing actually ships on the wire. The changelog entry exists purely so in-process processors can react to changes; legacy mSupply remains the source of truth and pushes master lists down via its own sync.

---

## 4. Changelog row metadata

Each changelog row carries a small set of metadata fields. Each filter joins through one of these fields to decide "is this row for me?".

| Field | What it means | What it's used for |
|---|---|---|
| **table_name** | Which table the row refers to. | Every filter — "table is in the set of tables I care about". |
| **record_id** | Primary key of the source row. | Used to fetch the actual record when batching. |
| **row_action** | Upsert or Delete. | Controls whether the receiver upserts or deletes. |
| **store_id** | The store this record belongs to (optional). | Remote / RemoteOwned routing (joined to the store's site). For broadcast rows this must be null, to disambiguate hybrid tables. |
| **transfer_store_id** | The "other party" store for cross-store records. | Transfer routing (joined to the counterpart store's site). |
| **patient_link_id** | The patient this record refers to. | Patient routing (joined via name-store-join → store → site, so any site that knows the patient receives the record). |
| **source_site_id** | The site that originally caused this changelog row. | Echo guards (don't push back to where it came from); also the v7 push filter ("rows authored here"). |

The source-site field is always populated. When a record is authored locally, it's the current site. When a record is integrated from another site, the original source is preserved. This is what powers every echo guard.

---

## 5. How records become changelog rows

When a record is mutated, a changelog row is generated. The patterns differ by what fields the changelog needs.

| Pattern | Tables (examples) | What the changelog records |
|---|---|---|
| Store + transfer-store | `Invoice`, `Requisition`, `RnrForm`, `NameStoreJoin` | The row's own store, plus the store backing a referenced name (resolved from the name's home store). Used for both store-owner routing and Transfer routing. `Invoice` additionally tags prescriptions with the patient id so they also route via Patient. |
| Store only | `StockLine`, `StockRelocation`, `Stocktake`, `Location`, `PurchaseOrder`, `Preference`, `Sensor`, `TemperatureBreach`, `TemperatureLog`, `VVMStatusLog`, `LocationMovement`, `ActivityLog`, `ContactForm`, `Asset`, `PluginData`, `VaccineCourseStoreConfig`, `ClinicianStoreJoin`, `IndicatorValue`, `ItemStoreJoin`, `UserPermission`, `UserStoreJoin` | Just the row's own store. |
| Destination store | `SyncMessage` | The message's destination store (when set) is copied to the changelog's `store_id`, which makes the hybrid Remote + broadcast routing work — Remote for messages addressed to a specific store, broadcast for fanout messages. |
| Line inherits parent | `InvoiceLine` ← `Invoice`, `StocktakeLine` ← `Stocktake`, `RequisitionLine` ← `Requisition`, `RnrFormLine` ← `RnrForm` | The line's changelog is built from the parent's, then `table_name` and `record_id` are overridden to point at the line. Guarantees parent and line stay aligned for store / transfer-store / patient / source-site, so they route together. |
| Line emits parent **and** child | `PurchaseOrderLine` → `PurchaseOrder` (upsert) + `PurchaseOrderLine` | Mutating a line also emits a changelog for the parent, so the parent re-syncs and is always at least as fresh as its children on the receiver. The parent entry is always an upsert, even when the line is a delete. |
| Patient + store | `Encounter`, `Vaccination`, `ContactTrace` | Carries both, so the Remote clause delivers to the owning site and the Patient clause fans out to every other site that knows the patient. |
| Patient only | `Document`, `NameInsuranceJoin`, `ProgramEnrolment`, `ProgramEvent` | The changelog row has no store; routing is purely by Patient. The record follows the patient across stores. |
| Cross-table store lookup | `AssetLog` (looks up the asset's store), `AssetInternalLocation` (looks up the location's store, falls back to the asset's store) | The record itself doesn't carry a store directly, so the generator queries a related row to find one. |
| `record_id` only | All central-broadcast tables (`Property`, `Demographic`, `VaccineCourse*`, `Abbreviation`, etc.) and a handful of legacy reference tables (`Clinician`, `Currency`, `Barcode`, `MasterList`, …) | No row metadata beyond table+id is needed — these tables filter purely by table name and route to everyone. |
| `record_id` only, with patient flag | `Name` | Same as `record_id` only, except that when the name's type is *patient* the changelog row also carries the name's own id as the patient. Non-patient names match the broadcast clause (store and patient both null) and route to every site; patient names fail the broadcast clause and instead match the Patient clause, so they fan out to every site that knows the patient. |

For deletes, the same generator is used; only the `row_action` field changes.

---

## 6. Outgoing-sync filters

Five filters compose the metadata above into "this site, this transport" predicates. The distribution-keyed filters read the **distribution** axis; the legacy-push filter reads the **transport flag**; the v7 push filter reads only the source-site field.

| Filter | Used by | What it returns | Echo guard |
| --- | --- | --- | --- |
| **all-data-for-site** | v6 central pull (OMS-native tables only); v7 central pull (all tables) | Per distribution clause: Central → store-id is null **and** patient-id is null; Remote → store's site = this site (every cycle); RemoteOwned → store's site = this site, but only during this site's initialisation; Transfer → transfer-store's site = this site; Patient → patient's site = this site (via name-store-join). NotDistributed is skipped. | Once initialised, exclude rows whose source-site = this site. |
| **patient-data-for-site** | v6 patient pull and v7 patient pull (used together with an explicit patient id) | Just the Patient clause from above, intersected with the requested patient id. | None at this layer — caller composes additional conditions. |
| **all-data-for-legacy-central** | v5 push (remote → legacy 4D) | Every table whose transport flag is **legacy-only** (tagged v5, not v6). It does not look at authoring or distribution at all. `Name`, the only both-transport table, is therefore not selected here — patient names reach central over v6 instead. The per-table translator still gates what actually ships: a selected table only pushes when its translator declares a legacy changelog mapping. | Exclude rows whose source-site is the legacy central server itself. |
| **all-data-edited-on-site** | v7 push (remote → OMS central) | Just "rows whose source-site = this site". No per-style filtering, no transport-flag filtering — the per-table translators are not consulted because v7 has no per-table translation. | Implicit — the predicate itself is the echo guard. |
| **data-for-store** | v7 store-transfer pull (when a store moves to this site, request all of that store's data) | Remote + RemoteOwned tables matched on store-id, plus Transfer tables matched on transfer-store-id, for one specific store, ignoring transport flags. | None. |

### Per-distribution behaviour inside `all-data-for-site`

| Distribution clause | Predicate added |
|---|---|
| Central | `store_id IS NULL AND patient_link_id IS NULL` (so hybrid tables only match the broadcast half here, and rows that carry a patient never match this clause) |
| Remote | `store.site_id == this site` (every cycle) |
| RemoteOwned | `store.site_id == this site`, **but only when the site is initialising** — otherwise skipped, because central never authors edits to push back |
| Transfer | `transfer_store.site_id == this site` |
| Patient | `patient_store.site_id == this site` (via name-store-join) |
| NotDistributed | skipped |

The filter joins changelog → store, changelog → transfer-store, changelog → name-store-join → patient-store. A row matches if any one of its applicable distribution clauses holds.

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
| `Name`, `NameStoreJoin` | Their translators opt in to push to OMS central, so they round-trip via OMS too — used to share patient details across sites. `Name` is tagged on both transports; `NameStoreJoin` is legacy-only by transport flag but its OMS push opt-in enables the round-trip. `NameStoreJoin` is also why its distribution is `Remote` rather than `RemoteOwned`: central legitimately authors edits to it — both when a patient's visibility changes and when customer/supplier flags on a name change (the name-to-name-store-join translator cascades the update to every join row for that name, including rows owned by other sites). When central is processing `Name` or `NameStoreJoin`, the translator additionally guards against echoing rows that originated from a remote (so central doesn't push a remote-authored update straight back to legacy 4D). |
| `NameOmsFields` | Central-authored on OMS, but its translator opts in to push to OMS central, allowing remote → central writebacks. |
| Vaccine-course family (`VaccineCourse`, `VaccineCourseDose`, `VaccineCourseItem`) | Central-authored on OMS, but a parallel set of legacy translators re-publishes them to legacy 4D when running on OMS central, so v5-only stores still receive them. |
| `Encounter` | Remote + Patient on v6. It has no main OMS translator of its own — the only translator is a companion legacy translator that re-publishes it to legacy 4D when running on OMS central, so v5-only stores still receive it. |
| `Vaccination` | Remote + Patient on v6. Its main translator opts in to OMS push/pull. A companion legacy translator re-publishes it to legacy 4D when running on OMS central, so v5-only stores still receive it. |
| `Document` | Legacy, Patient-only — the changelog row carries no store, so routing is purely by Patient. |
| `Name`, `Item`, `Clinician` merges | Legacy-format `Merge` records continue to flow up to legacy 4D and down to v5 remote sites as before; the merge translator rewrites the local link tables in-line, so central stays consistent regardless of any post-sync processing. **Additionally**, when the translator runs on OMS central it also emits a `SyncMessage` of the matching merge type (with no destination store, so it broadcasts) so v7 remotes — which never receive the legacy `Merge` record — can replay the same link rewrite via a post-sync processor. The processor is a no-op on central, since the translator already did the work. |
| `MasterList` | Central/Central, but the translator declares no changelog mapping, so nothing pushes on any transport — it only ever flows down from legacy 4D. |

For v7 there is **no** per-table translation step — the database row is serialised directly and deserialised on the other side. As a consequence, v7 push for a given table works whether or not its translator has a v6 opt-in.

---

## 8. The single useful invariant

> A row reaches a site only if **both** of the following agree:
>
> 1. The matrix (authoring + distribution + transport flag) says the site is an eligible recipient on this transport.
> 2. The transport-specific machinery actually carries the row — for v5/v6 that's a translator opt-in; for v7 it's blanket (any table with a sync style).

The matrix answers *who is eligible and in which direction*. The transport answers *which wire format*. A row only moves when both agree.

---

## How to regenerate this document

Run the slash command:

```text
/sync-styles-doc
```

(skill defined at `.claude/skills/sync-styles-doc/SKILL.md`). It reads the current code and rewrites this file from scratch — useful after sync-style changes, new tables, or new translators.
