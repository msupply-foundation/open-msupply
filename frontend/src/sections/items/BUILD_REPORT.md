# Build report — items

**Target stack:** SolidJS + Vite; shared component library `src/ui/` resolved through [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

Added by a later scoped run (`/spec-build items`, "build now, flag gaps"). Gates re-run green repo-wide: `pnpm check` ✓ · `pnpm test` ✓ (289, incl. 15 new items AC tests) · `pnpm build` ✓. Only `src/App.tsx` (one route registration) and `src/sections/items/` were touched. Built against a `:8890` (`fe-auth-contract`) introspection — the default `:8000` backend lacks the items schema (see the codegen flag below).

## What was built

| Area                | Status            | Notes                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pure-logic core** | ✅ built + tested | `list/itemFilter.ts` (stock-status lens expansion, UI→wire filter builder, custom-field `dynamicFilter` AST) + `list/itemStats.ts` (MOS-blank-at-zero, doses gate, decimal truncation) — 15 AC-citing tests.                                                                                                                                                     |
| **S1 list**         | ✅ built          | Page/Header/Toolbar/FilterBar/DataTable/Pagination. Always-present code-or-name search; chip filters: lens, min/max MOS, master-list (gated), at-risk (gated). Columns Code/Name(sortable)/Master-lists(chip)/Unit/Stock-on-hand/AMC/MOS(blank-at-zero) + one per non-hidden custom-field definition (boolean → `BooleanCell`). Server pagination; row → detail. |
| **S2 detail**       | ✅ partial        | Stats band (`StatsPanel`/`Statistic`/`CardGrid`) + URL-driven deep-linkable tabs. Built: General/Store/Master-lists/Custom-fields/Log(`ActivityLogPanel`) + not-found→list. Flagged: Ledger, Ancillary, Variants (placeholders).                                                                                                                                 |

## AC coverage

| AC                                                    | Where                                                 | Status                                        |
| ----------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| AC-L1/L2/L3/L4/L5/L6                                  | `list/itemFilter.test.ts`                             | ✅ tested                                     |
| AC-P2 custom-field filter AST                         | `list/itemFilter.test.ts`                             | ✅ logic tested (UI controls partial — flags) |
| AC-S2 MOS blank at zero; AC-S3 doses                  | `list/itemStats.test.ts`                              | ✅ tested                                     |
| AC-L7/L8/L9, AC-P1, AC-D1/D2/D6                       | list + detail screens                                 | ⚠️ built, not unit-tested (UI-level)          |
| AC-D7 variant edits in log                            | Log tab built; variant events need Variants (unbuilt) | ⚠️ partial                                    |
| AC-S1 AMC window; AC-P3 unknown key; AC-C2            | —                                                     | ❌ server-side, no client logic to test       |
| AC-D3/D4/D5 ledger; AC-C1 central gating; AC-V*/B*/A* | —                                                     | ❌ not built (flagged below)                  |

## Flags — component gaps

1. **Detail-form scaffold** (`DetailContainer`/`DetailSection`/`DetailRow`/`RecordNameHeader`) — registry ✅ but **not in main** (unmerged `names` branch). General/Store/Custom-fields composed from `LabelledValue`+`Text` **single-column** (the `stock` precedent), not the spec's two-column scaffold. _Extract the scaffold (like the boolean cell) to build these as specified._
2. **Ledger tab** — not built; needs a **date-time-range FilterBar field** (only single-date `FilterDate` exists) + `itemLedger` wiring + row→source-doc nav (AC-D3/D4/D5).
3. **Custom-field filter UI** — the **option-typeahead** + **date-range** chip controls aren't built (the `dynamicFilter` logic is, and is tested — AC-P2). Custom-field columns are built.
4. **Variants tab + S3/S4 modals** — not built (central-only); need the **variant card** (no registry role) + **editable packaging grid** (no primitive; DataTable editable cells 🔶 deferred).
5. **Ancillary tab + S5 modal** — not built (central-only).
6. **Central gating (AC-C1/C2)** — not wired (would gate on `isCentralServer`); deferred with 4/5.

## Flags — environment

- **C2 / codegen backend mismatch.** The default `:8000` backend lacks the items schema **and** is behind the repo's auth contract; the matching schema is `:8890` (`fe-auth-contract`). `pnpm codegen` currently fails repo-wide on pre-existing `auth.graphql`/`initialisation.graphql` (ahead of `:8890`) — a pre-existing drift, not items. Items docs were generated via a scoped runner against `:8890`. Consequence: the running app (`:3005`→`:8000`) can't load items data, so **no live-backend/visual verification** (C2/C5) — compile-correctness only.

## DIVERGENCES honoured

- D21/D22 (no toast; in-surface feedback) — the built read-only surfaces raise nothing; the unbuilt S3–S5 saves are specced for busy-OK + inline error.
- D8 (boolean cell a11y) — custom-field boolean columns use `BooleanCell` (named dot marker).

## Candidate spec refinements

- `Statistic` mandates an `href`, but the AMC/MOS stat panels have no drill-down (they self-link) — make `href` optional or specify a target.
- Item detail tabs as a URL param (spec S2) vs the built `stock` detail's local-signal tabs — worth stating as the intended pattern (this build used `useSearchParams`).
