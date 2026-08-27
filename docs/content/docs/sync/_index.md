+++
title = "Sync (V7)"
weight = 25
sort_by = "weight"
template = "docs/section.html"
+++

# Sync (V7)

Documentation for Open mSupply's synchronisation system, centred on **V7** — the
omSupply↔omSupply sync protocol — and how it coexists with the legacy v5/v6 transports.

These docs were previously kept under the repo's `syncdoc/` folder; they have been moved here
and made part of the rendered developer docs. The investigation, benchmark scripts and their
results that backed the design now live in the repo under
[`server/sync_v7_investigation/`](https://github.com/msupply-foundation/open-msupply/tree/develop/server/sync_v7_investigation)
and are linked from the relevant pages.

## Pages

- [Sync V7](v7/) — the core specification: changelog logic, `source_site_id`, sync-type
  filters, sync rules per sync style, the sync buffer, central API, pull/push, sanity checks,
  de-duplication, store/patient re-sync, and the post-migration `sync_request` re-sync.
- [Changelog filter, windowing & de-duplication](changelog-filter/) — the outgoing pull query
  in detail: routing filter, cursor windowing, de-duplication, and the full generated SQL.
- [Living with V5, V6 and V7](transition/) — how the three transports coexist; COGS / COMS /
  ROGS / ROMS terminology; the manual and automatic v6→v7 transition.
- [Sync styles, changelog generation & outgoing filters](sync_styles/) — the plain-English
  reference for transports, sync styles, per-table classification, changelog row metadata,
  outgoing filters, and translation directions (generated from code).
- [Adding a new synced table](adding-a-table/) — step-by-step guides for adding a table and
  wiring it into sync (V7-only, or integrating an existing v5/v6 table).

## Related code-side docs

- [Sync - Synchronisation](../../server/service/sync/) — the v5/v6 sync overview that lives
  alongside the code (glossary, record types, stages, translations, changelog).
