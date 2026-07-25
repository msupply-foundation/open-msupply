# Build report — items

**Target stack:** SolidJS + Vite; shared component library `src/ui/` resolved through [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

Added by a later scoped run (`/spec-build items`, "build now, flag gaps"). Gates re-run green repo-wide: `pnpm check` ✓ · `pnpm test` ✓ (289, incl. 15 new items AC tests) · `pnpm build` ✓. Only `src/App.tsx` (one route registration) and `src/sections/items/` were touched. Built against a `:8890` (`fe-auth-contract`) introspection — the default `:8000` backend lacks the items schema (see the codegen flag below).

## Update 2026-07-25 — central-server gating for the Variants tab

First slice of building out Variants/Bundling/Ancillary/Ledger: the Variants tab's **presence** is now wired to `isCentralServer()` (`detail/itemDetailTabs.ts`, colocated + unit-tested — `CAT-05.1`/`.2`), reusing the exact pattern `settings/sectionVisibility.ts` already proved out (a pure function over server-role/permission, `<Show>`-gated in the view). The tab renders an `EmptyState` placeholder on central; its actual content (cards, packaging grid, bundling) is a separate follow-up slice, as is the equivalent gating for the Ancillary tab's management affordances (deferred until its S5 modal exists — gating an action with nothing behind it isn't a meaningful unit).

## What was built

| Area                | Status            | Notes                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pure-logic core** | ✅ built + tested | `list/itemFilter.ts` (stock-status lens expansion, UI→wire filter builder, custom-field `dynamicFilter` AST) + `list/itemStats.ts` (MOS-blank-at-zero, doses gate, decimal truncation) — 15 AC-citing tests.                                                                                                                                                     |
| **S1 list**         | ✅ built          | Page/Header/Toolbar/FilterBar/DataTable/Pagination. Always-present code-or-name search; chip filters: lens, min/max MOS, master-list (gated), at-risk (gated). Columns Code/Name(sortable)/Master-lists(chip)/Unit/Stock-on-hand/AMC/MOS(blank-at-zero) + one per non-hidden custom-field definition (boolean → `BooleanCell`). Server pagination; row → detail. |
| **S2 detail**       | ✅ partial        | Stats band (`StatsPanel`/`Statistic`/`CardGrid`) + URL-driven deep-linkable tabs. Built: General/Store/Master-lists/Custom-fields/Log(`ActivityLogPanel`) + not-found→list. Flagged: Ledger, Ancillary, Variants (placeholders).                                                                                                                                 |

## Behaviour coverage (`OMS-REG-CAT-04/05/06/08.*` — [cases](../../../spec/items/cases/))

| Behaviour                                                                           | Where                                                 | Status                                        |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| CAT-04 `.25`/`.26`/`.5`-`.6`/`.27`/`.28`/`.29`/`.30`                                | `list/itemFilter.test.ts`                             | ✅ tested                                     |
| CAT-04 `.37` custom-field filter AST                                                | `list/itemFilter.test.ts`                             | ✅ logic tested (UI controls partial — flags) |
| CAT-04 `.34` MOS blank at zero; `.35` doses                                         | `list/itemStats.test.ts`                              | ✅ tested                                     |
| CAT-04 `.2`-`.4`/`.8`-`.10`/`.31`/`.32`, `.36`, `.13`/`.40`/`.44`                   | list + detail screens                                 | ⚠️ built, not unit-tested (UI-level)          |
| CAT-04 `.45` variant edits in log                                                   | Log tab built; variant events need Variants (unbuilt) | ⚠️ partial (pending)                          |
| CAT-04 `.33` AMC window; `.39` unknown key; CAT-05 `.20` central gate               | —                                                     | ❌ server-side, no client logic to test       |
| CAT-05 `.1`/`.2` Variants tab presence by server role                               | `detail/itemDetailTabs.test.ts`                       | ✅ tested                                     |
| CAT-04 `.22`-`.24`/`.41`-`.43` ledger; CAT-05 (rest)/06/08 variant/bundle/ancillary | —                                                     | ❌ not built (all `pending` — flagged below)  |

## Flags — component gaps

1. ~~**Detail-form scaffold** — not in main~~ **Resolved.** `DetailContainer`/`DetailSection`/`DetailRow` merged and in use (General/Store tabs, two-column via `FormColumns`/`FormColumn`) since the `names`-vertical merge.
2. **Ledger tab** — not built; a **date-only** range filter now exists (`FilterDateRange`, `FilterBar.tsx`), but the spec wants a **date-TIME** range ("From/To date/time") — nothing composes two `DateTimeField`s into a range yet. Needs that + `itemLedger` wiring + row→source-doc nav (`CAT-04.41`-`.43`), which also doesn't exist anywhere in the app yet (new logic, not a reuse).
3. **Custom-field filter UI** — the **option-typeahead** + **date-range** chip controls aren't built (the `dynamicFilter` logic is, and is tested — `CAT-04.38`). Custom-field columns are built.
4. **Variants tab + S3/S4 modals** — not built (central-only). The tab's central-only **presence** is wired (`CAT-05.1`/`.2`, above); still needed: the **variant card** (no registry role — closest precedent is `DashboardCard`, not action-set-shaped) + **packaging sub-grid** (closest precedent: `settings/configuration/SupplyLevelsModal.tsx`'s array-signal + `For` + add/remove-row idiom, extended to multi-field rows — not a `DataTable` editable-cells primitive, which this app doesn't use anywhere).
5. **Ancillary tab + S5 modal** — not built (central-only). Its own presence/read-only-vs-management gating is deferred to land with its CRUD (gating an action with no destination isn't a meaningful unit on its own).
6. ~~**Central gating** — not wired~~ **Partially resolved.** The `isCentralServer()` + `hasPermission('ITEM_NAMES_CODES_AND_UNITS_MUTATE')` pattern (proven in `settings/sectionVisibility.ts`) is now used for the Variants tab's presence (`CAT-05.1`/`.2`). The mutation-level gate (`CAT-05.20`, shared basis for `CAT-06`/`CAT-08`) still has nothing to gate — no variant/bundle/ancillary write exists yet.

## Flags — environment

- **C2 / codegen backend mismatch.** The default `:8000` backend lacks the items schema **and** is behind the repo's auth contract; the matching schema is `:8890` (`fe-auth-contract`). `pnpm codegen` currently fails repo-wide on pre-existing `auth.graphql`/`initialisation.graphql` (ahead of `:8890`) — a pre-existing drift, not items. Items docs were generated via a scoped runner against `:8890`. Consequence: the running app (`:3005`→`:8000`) can't load items data, so **no live-backend/visual verification** (C2/C5) — compile-correctness only.

## DIVERGENCES honoured

- D21/D22 (no toast; in-surface feedback) — the built read-only surfaces raise nothing; the unbuilt S3–S5 saves are specced for busy-OK + inline error.
- D8 (boolean cell a11y) — custom-field boolean columns use `BooleanCell` (named dot marker).

## Candidate spec refinements

- `Statistic` mandates an `href`, but the AMC/MOS stat panels have no drill-down (they self-link) — make `href` optional or specify a target.
- Item detail tabs as a URL param (spec S2) vs the built `stock` detail's local-signal tabs — worth stating as the intended pattern (this build used `useSearchParams`).
