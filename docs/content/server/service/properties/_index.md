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

The legacy mapping property values are **central-authored and flow one-way down** — COMS derives them from the OG record during its v5 import (gated on being central) and they flow out to v7 remotes via the host record. Values are never pushed on to OG.

Note the value rides the **whole host-record row** over v7, so concurrent edits across sites are **last-writer-wins** — there is no key-level merge on the v7 side. The v5 import on COMS *merges* (`merge_legacy_properties`) rather than overwriting: it refreshes only the OG-owned keys and preserves any other keys already in the blob, so an OG re-pull can't clobber OMS-authored values.
