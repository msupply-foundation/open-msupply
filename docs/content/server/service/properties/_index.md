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
