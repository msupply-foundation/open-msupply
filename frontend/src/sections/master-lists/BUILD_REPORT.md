# Build report — master-lists

**Target stack:** SolidJS + Vite; shared component library `src/ui/` resolved through [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

> **Superseded in part by the [UI migration](./ui-migration-report.md) (2026-07-30):** the S2 detail screen described below is **gone** ([D80](../../../spec/DIVERGENCES.md)) — a row now opens the items catalogue scoped to that master list — and the list gained a name search and an Items count column. Read that report for the current shape; this one records the original build.

Scoped build of the master-lists vertical (`spec/master-lists`) — a read-only Catalogue list + detail, **no mutations**. Types generated against `:8890` (`develop`) via the scoped codegen runner. After merging `main`, **all three gates pass** — `pnpm check` (0 TS errors) · `pnpm test` (green, incl. 4 new master-lists AC tests) · `pnpm build`. (The pre-existing `internal-orders` `tsc` breakage that previously blocked the `tsc -b` gates is now suppressed on `main` via `@ts-expect-error`; master-lists itself contributes zero errors.)

## Built

- **S1 list** — standard scaffold with **no filter controls** (captured as-is), Name (sortable) / Description columns, server pagination, row → detail. Store scoping is the client sending `existsForStoreId` (the `storeId` arg is auth/context only). Default sort name-ascending; only Name sortable.
- **Export split button** — Export CSV (primary) · Excel (menu), over the **currently-loaded page only** (`.26`); empty page → "No data available" instead of a download (`.29`). CSV downloads directly; Excel round-trips the CSV through the shared server converter (`domain/reportFiles`). Silent (no toast — D21).
- **S2 detail** — description field shown only when non-empty (`.11`/`.31`); item-lines table Code / Name (sortable) / Unit; not-found → blocking alert → back to list (`.22`); server pagination. Lines selected by the `masterListId` **argument** (never a filter field — contract wire trap); sort last-entry-wins.
- Route registered under `catalogue/master-lists` (list `/`, detail `/:masterListId`); the Catalogue › Master Lists nav entry already existed. Pure-logic export core + 4 behaviour-citing tests colocated.

## Behaviour coverage (`OMS-REG-CAT-07.*`)

| Behaviour                                                                              | Where                      | Status                                                        |
| -------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------- |
| `.26` export = loaded page; `.29` empty → no-data                                      | `masterListExport.test.ts` | ✅ tested                                                     |
| `.1` store-joined population (`existsForStoreId`)                                      | `MasterListsList.tsx`      | ⚠️ built, not unit-tested                                     |
| `.6`/`.7` retired — no filter controls exist (captured as-is); `.3`–`.5` name-asc sort | list                       | ⚠️ built                                                      |
| `.22` not-found → list                                                                 | detail                     | ⚠️ built                                                      |
| `.23` non-joined list reachable by id (header omits `existsForStoreId`)                | detail                     | ⚠️ built                                                      |
| `.14` lines item-name sort; `.11`/`.31` description present-only                       | detail                     | ⚠️ built                                                      |
| `.24` inactive lists unreachable                                                       | —                          | server-enforced (repo forces `isActive`); not client-testable |

## Flags

- **Plugin columns (list)** — the plugin-column seam isn't wired; no plugin system is built. Flagged, not improvised.
- No live/visual verification — the app proxies `:8000` (remote, PRE_INITIALISATION). The read-only queries were exercised live on `:8890` during the reverse spec.

## Follow-ups

- **Plugin-column seam** — wire once a plugin system exists; not improvised here.
- **Live/visual verification** — pending a working `:8000` (currently PRE_INITIALISATION). Read-only queries verified on `:8890` during the reverse spec.
- **Codegen env** — types were generated via a scoped runner against `:8890`; repo `pnpm codegen` still fails on the pre-existing `auth.graphql` mismatch. Not master-lists-specific — affects every build.
