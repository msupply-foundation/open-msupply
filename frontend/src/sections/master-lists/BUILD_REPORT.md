# Build report — master-lists

**Target stack:** SolidJS + Vite; shared component library `src/ui/` resolved through [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

Scoped build of the master-lists vertical (`spec/master-lists`) — a read-only Catalogue list + detail, **no mutations**. Types generated against `:8890` (`develop`) via the scoped codegen runner. After merging `main`, **all three gates pass** — `pnpm check` (0 TS errors) · `pnpm test` (green, incl. 4 new master-lists AC tests) · `pnpm build`. (The pre-existing `internal-orders` `tsc` breakage that previously blocked the `tsc -b` gates is now suppressed on `main` via `@ts-expect-error`; master-lists itself contributes zero errors.)

## Built

- **S1 list** — standard scaffold with **no filter controls** (captured as-is), Name (sortable) / Description columns, server pagination, row → detail. Store scoping is the client sending `existsForStoreId` (the `storeId` arg is auth/context only). Default sort name-ascending; only Name sortable.
- **Export split button** — Export CSV (primary) · Excel (menu), over the **currently-loaded page only** (AC-E1); empty page → "No data available" instead of a download (AC-E3). CSV downloads directly; Excel round-trips the CSV through the shared server converter (`domain/reportFiles`). Silent (no toast — D21).
- **S2 detail** — description field shown only when non-empty (AC-D4); item-lines table Code / Name (sortable) / Unit; not-found → blocking alert → back to list (AC-L5); server pagination. Lines selected by the `masterListId` **argument** (never a filter field — contract wire trap); sort last-entry-wins.
- Route registered under `catalogue/master-lists` (list `/`, detail `/:masterListId`); the Catalogue › Master Lists nav entry already existed. Pure-logic export core + 4 AC tests colocated.

## AC coverage

| AC                                                                      | Where                      | Status                                                        |
| ----------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------- |
| AC-E1 export = loaded page; AC-E3 empty → no-data                       | `masterListExport.test.ts` | ✅ tested                                                     |
| AC-L1 store-joined population (`existsForStoreId`)                      | `MasterListsList.tsx`      | ⚠️ built, not unit-tested                                     |
| AC-L2 no filter controls; AC-L3 name-asc sort                           | list                       | ⚠️ built                                                      |
| AC-L5 not-found → list                                                  | detail                     | ⚠️ built                                                      |
| AC-L6 non-joined list reachable by id (header omits `existsForStoreId`) | detail                     | ⚠️ built                                                      |
| AC-D2 lines item-name sort; AC-D4 description present-only              | detail                     | ⚠️ built                                                      |
| AC-L7 inactive lists unreachable                                        | —                          | server-enforced (repo forces `isActive`); not client-testable |

## Flags

- **Store CODE in the CSV filename** — the spec wants `<iso>_<store code>_master-lists.csv`, but only `currentStoreId()` is exported (no active-store-**code** accessor), so the filename currently uses the store **id**. Needs an exported active-store-code accessor (see Follow-ups).
- **Plugin columns (list)** — the plugin-column seam isn't wired; no plugin system is built. Flagged, not improvised.
- No live/visual verification — the app proxies `:8000` (remote, PRE_INITIALISATION). The read-only queries were exercised live on `:8890` during the reverse spec.

## Follow-ups

- **Active-store-code accessor** _(shared)_ — the one thing between the export and a spec-exact filename. Only `currentStoreId()` exists today; a store-**code** accessor would let the CSV name match `<iso>_<store code>_master-lists.csv`.
- **Plugin-column seam** — wire once a plugin system exists; not improvised here.
- **Live/visual verification** — pending a working `:8000` (currently PRE_INITIALISATION). Read-only queries verified on `:8890` during the reverse spec.
- **Codegen env** — types were generated via a scoped runner against `:8890`; repo `pnpm codegen` still fails on the pre-existing `auth.graphql` mismatch. Not master-lists-specific — affects every build.
