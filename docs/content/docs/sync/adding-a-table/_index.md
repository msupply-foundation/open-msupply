+++
title = "Adding a new synced table"
weight = 60
sort_by = "weight"
template = "docs/section.html"
+++

# Adding a new synced table

Reference walkthroughs for adding a new table to the open-mSupply server and wiring it into
sync. Both build on the [Sync V7 specification](../v7/) — read the relevant parts of that
first to understand the mechanism (the changelog, sync styles, integration order, the sync
buffer, and the `sync_request` re-sync used after a v7 migration).

Pick the guide that matches your situation:

- [Adding a new table (V7 sync)](v7-sync/) — the simplest case: a **brand-new table** that
  needs to sync over **V7 only** (no legacy central mSupply support).
- [Integrating a v5/v6 table (+ V7)](v5-v6-and-v7/) — a table that **already syncs in central
  mSupply over v5/v6** but isn't processed by open-mSupply yet. Adds the legacy translation on
  top of the repository + V7 work, so the table integrates over both transports.

Both guides use a fictional `widget` table with full code for every file that changes, and end
with the verification commands. They assume the [Sync V7](../v7/) and
[Sync styles](../sync_styles/) pages for the underlying concepts.
