# Build report — items

**Target stack:** SolidJS + Vite; shared component library `src/ui/` resolved through [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

Added by a later scoped run (`/spec-build items`, "build now, flag gaps"). Gates re-run green repo-wide: `pnpm check` ✓ · `pnpm test` ✓ (289, incl. 15 new items AC tests) · `pnpm build` ✓. Only `src/App.tsx` (one route registration) and `src/sections/items/` were touched. Built against a `:8890` (`fe-auth-contract`) introspection — the default `:8000` backend lacks the items schema (see the codegen flag below).

## Update 2026-07-25 — central-server gating for the Variants tab

First slice of building out Variants/Bundling/Ancillary/Ledger: the Variants tab's **presence** is now wired to `isCentralServer()` (`detail/itemDetailTabs.ts`, colocated + unit-tested — `CAT-05.1`/`.2`), reusing the exact pattern `settings/sectionVisibility.ts` already proved out (a pure function over server-role/permission, `<Show>`-gated in the view). The tab renders an `EmptyState` placeholder on central; its actual content (cards, packaging grid, bundling) is a separate follow-up slice, as is the equivalent gating for the Ancillary tab's management affordances (deferred until its S5 modal exists — gating an action with nothing behind it isn't a meaningful unit).

## Update 2026-07-27 — Ledger tab

Second slice: the Ledger tab is now fully built (`ItemLedgerPanel.tsx` + `itemLedger.graphql` + `itemLedgerNav.ts`), closing `CAT-04.22`/`.24`/`.41`/`.42` and most of `.23` (source-document navigation). Server-paginated, fixed most-recent-first (the endpoint has no sort input); filters by document type, status, and a new date-_time_ range control; row-click navigates by invoice type.

- **`FilterDateTimeRange`** added to `FilterBar.tsx` — two independent `DateTimeField`s (From/To), since no shared range primitive picks time yet (unlike `FilterDateRange`'s date-only corvu range calendar). Documented in `src/ui/docs/UI_ELEMENTS.md`.
- **Row navigation (`itemLedgerNav.ts`, new logic — nothing like it existed anywhere in the app)**: routes `OUTBOUND_SHIPMENT`/`INBOUND_SHIPMENT`/`CUSTOMER_RETURN`/`PRESCRIPTION` to their existing detail routes; `INVENTORY_ADDITION`/`INVENTORY_REDUCTION` never navigate (spec). `isExternal` (PO-born inbound shipment) does **not** change the route — `InboundShipmentDetailView` already renders both on the same route, branching internally (the schema doc-comment's "separate routes" describes the _reference_ app, not this rewrite).
- **Known gap, not a spec exclusion**: `SUPPLIER_RETURN` and `REPACK` ledger rows don't navigate — neither has a built route in this app yet. Revisit once those verticals exist; `.23`'s case bullet notes this explicitly so it isn't mistaken for a regression.
- **Codegen backend mismatch (flag below) no longer reproduces** — `pnpm codegen` against the default `:8000` now succeeds repo-wide (72 files, byte-identical except the new `itemLedger.generated.ts`); `ItemVariantNode`/`BundledItemNode`/`AncillaryItemNode` all resolve there too. Worth re-confirming before the Variants/Ancillary slices assume it's still needed, but as of this pass a scoped `:8890` runner is no longer necessary.

## What was built

| Area                | Status            | Notes                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pure-logic core** | ✅ built + tested | `list/itemFilter.ts` (stock-status lens expansion, UI→wire filter builder, custom-field `dynamicFilter` AST) + `list/itemStats.ts` (MOS-blank-at-zero, doses gate, decimal truncation) — 15 AC-citing tests.                                                                                                                                                     |
| **S1 list**         | ✅ built          | Page/Header/Toolbar/FilterBar/DataTable/Pagination. Always-present code-or-name search; chip filters: lens, min/max MOS, master-list (gated), at-risk (gated). Columns Code/Name(sortable)/Master-lists(chip)/Unit/Stock-on-hand/AMC/MOS(blank-at-zero) + one per non-hidden custom-field definition (boolean → `BooleanCell`). Server pagination; row → detail. |
| **S2 detail**       | ✅ partial        | Stats band (`StatsPanel`/`Statistic`/`CardGrid`) + URL-driven deep-linkable tabs. Built: General/Store/Master-lists/Ledger(`ItemLedgerPanel`)/Custom-fields/Log(`ActivityLogPanel`) + not-found→list. Flagged: Ancillary, Variants (placeholders).                                                                                                               |

## Behaviour coverage (`OMS-REG-CAT-04/05/06/08.*` — [cases](../../../spec/items/cases/))

| Behaviour                                                                                           | Where                                                 | Status                                        |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| CAT-04 `.25`/`.26`/`.5`-`.6`/`.27`/`.28`/`.29`/`.30`                                                | `list/itemFilter.test.ts`                             | ✅ tested                                     |
| CAT-04 `.37` custom-field filter AST                                                                | `list/itemFilter.test.ts`                             | ✅ logic tested (UI controls partial — flags) |
| CAT-04 `.34` MOS blank at zero; `.35` doses                                                         | `list/itemStats.test.ts`                              | ✅ tested                                     |
| CAT-04 `.2`-`.4`/`.8`-`.10`/`.31`/`.32`, `.36`, `.13`/`.40`/`.44`                                   | list + detail screens                                 | ⚠️ built, not unit-tested (UI-level)          |
| CAT-04 `.22`/`.24`/`.41`/`.42` ledger table/filters/pagination; `.23` nav (partial — see gap below) | `detail/ItemLedgerPanel.tsx`, `itemLedgerNav.test.ts` | ✅ built (nav logic tested)                   |
| CAT-04 `.43` inventory-adjustment rows don't navigate                                               | `itemLedgerNav.test.ts`                               | ✅ tested                                     |
| CAT-04 `.45` variant edits in log                                                                   | Log tab built; variant events need Variants (unbuilt) | ⚠️ partial (pending)                          |
| CAT-04 `.33` AMC window; `.39` unknown key; CAT-05 `.20` central gate                               | —                                                     | ❌ server-side, no client logic to test       |
| CAT-05 `.1`/`.2` Variants tab presence by server role                                               | `detail/itemDetailTabs.test.ts`                       | ✅ tested                                     |
| CAT-05 (rest)/06/08 variant/bundle/ancillary                                                        | —                                                     | ❌ not built (all `pending` — flagged below)  |

## Flags — component gaps

1. ~~**Detail-form scaffold** — not in main~~ **Resolved.** `DetailContainer`/`DetailSection`/`DetailRow` merged and in use (General/Store tabs, two-column via `FormColumns`/`FormColumn`) since the `names`-vertical merge.
2. ~~**Ledger tab** — not built~~ **Resolved 2026-07-27** — see the Update above. Remaining gap: `SUPPLIER_RETURN`/`REPACK` rows don't navigate (no route built for either vertical yet).
3. **Custom-field filter UI** — the **option-typeahead** + **date-range** chip controls aren't built (the `dynamicFilter` logic is, and is tested — `CAT-04.38`). Custom-field columns are built.
4. **Variants tab + S3/S4 modals** — not built (central-only). The tab's central-only **presence** is wired (`CAT-05.1`/`.2`, above); still needed: the **variant card** (no registry role — closest precedent is `DashboardCard`, not action-set-shaped) + **packaging sub-grid** (closest precedent: `settings/configuration/SupplyLevelsModal.tsx`'s array-signal + `For` + add/remove-row idiom, extended to multi-field rows — not a `DataTable` editable-cells primitive, which this app doesn't use anywhere).
5. **Ancillary tab + S5 modal** — not built (central-only). Its own presence/read-only-vs-management gating is deferred to land with its CRUD (gating an action with no destination isn't a meaningful unit on its own).
6. ~~**Central gating** — not wired~~ **Partially resolved.** The `isCentralServer()` + `hasPermission('ITEM_NAMES_CODES_AND_UNITS_MUTATE')` pattern (proven in `settings/sectionVisibility.ts`) is now used for the Variants tab's presence (`CAT-05.1`/`.2`). The mutation-level gate (`CAT-05.20`, shared basis for `CAT-06`/`CAT-08`) still has nothing to gate — no variant/bundle/ancillary write exists yet.

## Flags — environment

- ~~**C2 / codegen backend mismatch.**~~ **Resolved as of 2026-07-27** — `pnpm codegen` against the default `:8000` now succeeds repo-wide; see the Ledger-tab Update above. (Original note, for history: the default `:8000` backend used to lack the items schema and sit behind the repo's auth contract, so items docs were generated via a scoped `:8890` runner.)

## DIVERGENCES honoured

- D21/D22 (no toast; in-surface feedback) — the built read-only surfaces raise nothing; the unbuilt S3–S5 saves are specced for busy-OK + inline error.
- D8 (boolean cell a11y) — custom-field boolean columns use `BooleanCell` (named dot marker).

## Candidate spec refinements

- `Statistic` mandates an `href`, but the AMC/MOS stat panels have no drill-down (they self-link) — make `href` optional or specify a target.
- Item detail tabs as a URL param (spec S2) vs the built `stock` detail's local-signal tabs — worth stating as the intended pattern (this build used `useSearchParams`).
