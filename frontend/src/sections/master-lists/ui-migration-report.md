# Master Lists (Catalogue) — UI migration report

**Scope:** the whole `master-lists` vertical — the S1 list screen, its export action, the export logic, the routes, and the S2 detail view. Run under [`migrate-ui`](../../../../.claude/skills/migrate-ui/SKILL.md) against the eleven dimensions of [`MIGRATING_A_VERTICAL.md`](../../ui/docs/MIGRATING_A_VERTICAL.md).

**Plus one directed structural change** ([#776](https://github.com/msupply-foundation/open-msupply-frontend/issues/776)): remove the S2 detail view and make a list row open the **Items list filtered to that master list** instead.

**Status: MIGRATED.** Four of five findings applied (F4 deferred by the operator), the structural change landed, three sign-off decisions all answered yes and built, nine spec files reconciled, one new divergence recorded. `pnpm check` and `pnpm test` green, anchor guard green. **The visual pass is yours to complete** — the list is at the end.

## What changed

| ID     | Change                                                                                                                                                                      | Dims   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **F1** | The S2 detail view, its route, and the `masterListLines` query are **deleted**; a row opens the items list scoped to that master list ([D80](../../../spec/DIVERGENCES.md)) | 2/3/11 |
| **F2** | Both list columns take their cell-type width presets (`getCellDefinition`), so they size correctly and drag to resize                                                       | 3      |
| **F3** | The table gained `configIsDefault` + the central-admin-gated `onSaveGlobalDefault`                                                                                          | 3      |
| **F5** | The export action takes the GraphQL rows directly; the redundant `exportRows` remap is gone                                                                                 | 8      |
| **D1** | The list gained a **name search** — one seeded `FilterBar` chip, present on arrival with no menu step                                                                       | 3/11   |
| **D2** | The list gained an **Items** count column (`linesCount` added to the fragment)                                                                                              | 3/11   |
| **FR** | **Found by the reactivity pass, not the audit:** `columns()` was a plain function, so every read handed TanStack a fresh array reference                                    | 7      |
| **F4** | The empty-export `Alert` — **deferred by the operator** (low priority); unchanged                                                                                           | 1/2    |

## Coverage — greened

Rows = every screen/piece in scope; columns = the eleven dimensions.

| Screen / piece                       | 1 Registry | 2 Composition | 3 Tables       | 4 Inputs | 5 Detail/panel | 6 Styling | 7 Reactivity | 8 Types | 9 A11y | 10 Test hooks | 11 Spec          |
| ------------------------------------ | ---------- | ------------- | -------------- | -------- | -------------- | --------- | ------------ | ------- | ------ | ------------- | ---------------- |
| `index.tsx` (routes)                 | ✅         | ✅ F1         | —              | —        | —              | ✅        | ✅           | ✅      | ✅     | ✅            | ✅ F1            |
| S1 `list/MasterListsList.tsx`        | ✅         | ✅            | ✅ F2·F3·D1·D2 | ✅ D1    | —              | ✅        | ✅ FR        | ✅ F5   | ✅     | ✅            | ✅ F1·D1·D2      |
| `list/listFilters.tsx` **(new)**     | ✅         | —             | ✅ D1          | ✅ D1    | —              | ✅        | ✅           | ✅      | ✅     | ✅            | ✅ D1            |
| `list/masterListsListState.ts` (new) | —          | —             | —              | —        | —              | —         | ✅           | ✅      | —      | —             | ✅               |
| `list/itemsListLink.ts` **(new)**    | —          | —             | —              | —        | —              | —         | ✅           | ✅      | —      | —             | ✅ F1            |
| `list/ExportMasterListsAction.tsx`   | ⚠️ F4      | ⚠️ F4         | —              | ✅       | ✅             | ✅        | ✅           | ✅      | ✅     | ✅            | ✅               |
| `masterListExport.ts` (+ test)       | —          | —             | —              | —        | —              | —         | —            | ✅      | —      | —             | ✅               |
| S2 `detail/MasterListDetailView.tsx` | —          | —             | —              | —        | —              | —         | —            | —       | —      | —             | **deleted (F1)** |

## The findings in detail

### F1 — The detail view is gone; a row opens the filtered items list · **applied**

The S2 detail was a read-only description field plus a code/name/unit lines table. The items list answers the same question better — it already carries a **Master list** filter chip, a far richer column set, and drill-down into each item.

**Deleted:** `detail/MasterListDetailView.tsx`, the `/:masterListId` route, `masterListLines.graphql`, `masterListLines.generated.ts`. Nothing else in `src/`, `e2e/` or `exploratory/` linked to that route.

**The link** is [`list/itemsListLink.ts`](list/itemsListLink.ts), following the settled house pattern in [`sections/dashboard/statLinks.ts`](../dashboard/statLinks.ts): this vertical owns _what_ the link filters by, the target list owns the URL encoding (the shared `?query=` JSON param), and the filter object is checked with `satisfies ItemsListFilter` against a **type-only** import of the items list's own filter type — so a drift in the items contract stops compiling here.

**The subtle part, and why it has its own test.** `useUrlQueryState` merges the URL's state _shallowly_ over the target's defaults, so a `filter` in the URL **replaces** the items list's whole `DEFAULT_STATE.filter` — including its `codeOrName: null` search-chip seed. The link carries that seed explicitly; without it the items list's always-present search chip silently vanishes when arrived at this way. [`itemsListLink.test.ts`](list/itemsListLink.test.ts) pins it so nobody tidies it away. **This is also a latent bug in the dashboard's stat links** — see [Library / cross-vertical findings](#library--cross-vertical-findings-flagged-not-fixed).

### F2 · F3 · F5 — the table findings · **applied**

- **F2** — `getCellDefinition('name', { wrapLines: 2, headerPosition: 'primary' })` and `getCellDefinition('description', { wrapLines: 2 })`; both keys exist in `CELL_DEF` as the `text` (flex-sink) kind. Previously neither column set a `size` at all, so they rendered at TanStack's default and dragged against nothing ([`CELL_TYPES.md` § Width model](../../ui/docs/CELL_TYPES.md)).
- **F3** — `configIsDefault={tableConfig.isConfigDefault()}` + `onSaveGlobalDefault` gated on `tableConfig.canSaveGlobalDefault()`, matching names (its R6), items, patients, inbound and customer returns.
- **F5** — the generated node is already exactly `{ id, code, name, description }` with all four non-null, so `rows` satisfies `MasterListExportRow[]` structurally. The remap is deleted and `rows` is passed straight through (`kdd/type-safety`).

### D1 — The name search · **applied** (operator: yes)

[`list/listFilters.tsx`](list/listFilters.tsx) follows the names pattern: an **exhaustive keyed map over every key of the generated `MasterListFilterInput`**, each key either given a definition or explicitly dismissed with `null`. Codegen adding a filter key breaks compilation here until someone decides expose-or-dismiss, so the map is both the definition and the completeness proof. Only `name` is exposed; `existsForStoreId` is dismissed because the page applies it itself.

The chip is seeded present via `DEFAULT_STATE.filter = { name: null }` — `FilterBar` shows a chip iff its key is on the filter, and `null` is its "added but empty" marker. `buildFilter` drops the null, so the seed never perturbs the query. The dedicated free-text **search field** role is still ⛔ in the registry, so this is the sanctioned `FilterBar` substitution, same as items and names.

### D2 — The Items count column · **applied** (operator: yes), with a caveat worth your eye

`linesCount` added to the fragment; the column uses `getNumberCell()` + an explicit `remToPx(6)` (no `CELL_DEF` key for a membership count — the sanctioned call-site route). The number cell renders an absent value **blank**, so a null count never reads as a real zero.

**⚠️ The count and the destination can disagree.** `MasterListNode.linesCount` carries **no store scoping** — it is the list's central membership. The items list a row opens applies the store's own item visibility on top (`isVisibleOrOnHand`, active, stock-type). So a list showing "40 items" can open onto fewer rows. I have specced this explicitly rather than papering over it (`rules.md`, `contract.md`, `ui-surface.md` all say so, with a `⚠️ VERIFY` on the live figures), but **it is a product call you may want to revisit** — the honest alternatives are to keep it and label the column for central membership, or drop the column. Worth a deliberate look during the visual pass with a store whose visibility trims a list.

### FR — `columns()` handed TanStack a fresh array every read · **applied** (audit miss)

- **Rule:** [`kdd/solid-reactivity-pitfalls`](../../../kdd/solid-reactivity-pitfalls/draft-kdd.md) §14 — TanStack memoizes on the column array's **reference**, so a fresh array per read invalidates four layers of its internal memo chain.
- **Was:** `const columns = (): Column<…>[] => [...]`, read as `columns={columns()}` — and a JSX prop is a lazy getter, so every read re-invoked it.
- **Now:** `createMemo`, re-deriving only when the language changes (the headers' one dependency). Matches `ItemsList`, which carries the KDD citation; names, locations and stock still use the plain-function form, so this is a **candidate cleanup for those three** — flagged below, not done here.
- **Audit miss, honestly:** I read this function during the audit (I was changing it for F2 and D2) and didn't judge it, because the plain-function form is what three sibling verticals do. The reactivity pass on the diff is what caught it.

### F4 — The empty-export notice · **deferred** (operator: low priority)

Left exactly as it was. Recorded for whoever picks it up:

**When you can even see it** — `buildCsv` runs only on an Export click, so it needs a store with **zero** store-visible master lists, followed by a click on Export. With no filters and pagination resetting, nothing else reaches an empty `rows()`. On any store with lists it is unreachable, which is why it's hard to find.

Two things are wrong inside that narrow case: the `Alert` **doesn't clear** (`setNoData` is re-evaluated only by another export attempt, and on an empty store that attempt never has rows), and it sits **inside `HeaderButtons`**, a wrap-enabled actions cluster no other vertical puts a banner in. The in-scope fix is `createFlash` instead of `createSignal`; the placement is a visual judgement. The library half is below.

## Spec reconciliation

The structural change is a deliberate departure from the reference app, so it is recorded as a divergence, not a capture. Nine files, all signed off before editing:

- **[`spec/DIVERGENCES.md`](../../../spec/DIVERGENCES.md) — new row D80**, covering the removed detail screen, the row hand-off, and the two facts the list absorbed (count, search). Its rationale records that a future central-administration surface for _editing_ membership is a separate, write-bearing screen and is not foreclosed — @mark-prins' point on the issue.
- **[`ui-surface.md`](../../../spec/master-lists/ui-surface.md)** — S2 replaced by "Membership (the items list)"; S1 gains a Filters section and the Items column; the two duplicate Layout blocks merged; S3 loses the not-found alert.
- **[`rules.md`](../../../spec/master-lists/rules.md)** — "The detail record" → "Item membership"; the scoping bullet no longer promises a reachable non-joined detail; the count's central-vs-visible caveat stated; invariants summary rewritten.
- **[`contract.md`](../../../spec/master-lists/contract.md)** — headings still mirror `rules.md`; `masterListLines` is now **named but not consumed**, keeping both its wire traps on the record for the verticals that do read it; the surface index and permissions updated.
- **[`README.md`](../../../spec/master-lists/README.md)** — purpose, scope, the mermaid flow, the Export glossary row, and the Status section's divergence + known-gaps list.
- **The behaviour case** — renamed to `OMS-REG-CAT-07 - Validate Master Lists View and Membership.md` (the case ID is unchanged and the anchor tooling resolves by frontmatter `id:`, not filename). Retired `.10`, `.11`, `.12`, `.14`, `.22`, `.23`, `.30`, `.31` — **one tombstone bullet each**, because the guard's tombstone regex anchors to the start of a list item and a combined bullet would silently retire only the first. Added `.32` (the hand-off), `.33` (name search), `.34` (item count). `.13`, `.20`, `.21`, `.24` reworded.
- **[`acceptance.md`](../../../spec/master-lists/acceptance.md)** — the Detail mapping group records that all four AC-D* criteria's behaviours are now retired rather than folded; AC-L5/L6 likewise.
- **[`exploratory/workflows/master-lists.md`](../../../exploratory/workflows/master-lists.md)** — intro, anchor row, suggested order, environment fitness, test-data profiles, probe ideas, and the verification recipe. The hand-off is now the workflow's hardest-probed surface, with a three-way count cross-check (`linesCount` vs `items(masterListId:)` vs `masterListLines`) that would expose the D2 caveat live.
- **[`BUILD_REPORT.md`](BUILD_REPORT.md)** — a superseded-in-part banner pointing here.

**Also fixed, unrelated and pre-existing:** `spec/DIVERGENCES.md` ended with a stray `>>>>>>> origin/main` conflict marker (prettier had reformatted it into a blockquote), committed in merge `b427995d`. Removed — a dangling conflict marker in the source of truth is plain garbage, and I was editing the file anyway.

## Boutique / uncovered elements

**None.** Every element in scope is a built (✅) library component. Two ⛔ registry roles are touched and keep their documented substitutions: the dedicated **free-text search field** (⛔ → a seeded `FilterBar` text chip, as items and names also adopted) and, for the Items column, the absence of a `CELL_DEF` key for a membership count (⛔-adjacent → the explicit helper + a call-site width, the route `CELL_TYPES.md` sanctions).

## Library / cross-vertical findings — flagged, not fixed

The migration does not change shared library code or other verticals. Each needs its own signed-off task:

- **L1 · The dashboard's stat links drop the items list's search-chip seed.** [`statLinks.ts`](../dashboard/statLinks.ts)'s five items links (`itemsOutOfStockHref`, `itemsAtRiskHref`, `itemsLowStockHref`, `itemsHighStockHref`, `itemsOverstockedHref`) send `{ filter: { lens: … } }` with no `codeOrName: null`. Because `useUrlQueryState` merges shallowly, arriving from a dashboard stat **replaces** the items list's default filter and the always-present search chip is gone until re-added through the menu — the same trap `itemsListLink.ts` avoids. Small fix, but it's the dashboard's file and its own spec. **Not verified live** — reasoned from the merge semantics and confirmed against the items `DEFAULT_STATE`; worth a click before filing.
- **L2 · `FilterBar` has no always-on / non-removable chip.** This vertical seeds `filter: { name: null }` so the search is present on arrival, but the user can still remove the chip, after which "always-present" is gone until re-added via the menu. Already **L3 in the items report** and **L1 in the names report**; master-lists is the fourth vertical hitting it.
- **L3 · `CELL_DEF` has no key for a membership/record count.** Handled with a call-site width per `CELL_TYPES.md`. A `linesCount`-style count key is a candidate for `_globalColumnConfig.ts` when that rollout continues — alongside the names report's L4 list.
- **L4 · `ListExportAction` has no "nothing to export" outcome.** Which is why this vertical hand-rolls one (F4). Giving the shared action that outcome would put it on the initiating control like every other outcome, and would delete the local `Alert` entirely. → an [`ADDING_A_COMPONENT.md`](../../ui/docs/ADDING_A_COMPONENT.md)-style task on the shared action.
- **L5 · Three verticals still build their column array as a plain function.** `NamesList`, `LocationsList` and `StockList` have the FR pattern (fresh array reference per read → TanStack memo-chain invalidation). Mechanical one-line fix each, but each is another vertical's file.

## Verification

- `pnpm check` — **green** (exit 0: CSS-module types, `tsc -b`, stylelint, theme contract 65 tokens, page-CSS guard, browser floor).
- `pnpm test` — **green**, 115 files / 1078 tests, including 3 new `itemsListLink` tests.
- `python3 exploratory/tools/check_anchor_refs.py` — **green**, all 1251 references resolve across 98 files after the retirements, the three new behaviours, and the case rename.
- `check-reactivity` on the working diff — one REAL finding (FR, fixed above). The `rows()` bare `.latest` read is the sanctioned case (this screen's own first load, no live user state to lose); the module-level `FILTERS` constant is the stable-identity form `FilterBar`'s `<For>` needs; `filters={<FilterBar …/>}` is resolved once by `DataTable`'s `children()`, and the `pagination` object is spread live by design.
- **Codegen note:** `pnpm codegen` (backend live on :8000) also reformatted `vvmStatus.generated.ts` and `outboundDetail.generated.ts` — prettier drift, no schema change. Both reverted to keep this diff to the vertical.
- No inline `style`, colour literal, px, or CSS module anywhere in the vertical. No test id changed; `filter-input-name` is newly emitted by `FilterBar` for the search chip.

## The visual pass — yours to complete

Static checks cannot catch "compiles clean but looks wrong". Open in **light and dark**:

| Screen              | Route                                      | Compare against                                                                  |
| ------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| Master lists        | `/{storeId}/catalogue/master-lists`        | `#/showcase/table`; the names list (`/{storeId}/replenishment/suppliers`)        |
| The hand-off target | click a row → `/{storeId}/catalogue/items` | the items list opened from the nav — they should differ only by the applied chip |

Worth looking at specifically, since these are what changed:

1. **The hand-off.** Click a row: the items list should open with the **Master list** chip showing that list's _name_, **and** the code-or-name search chip still present beside it. That second chip is the whole point of the `codeOrName: null` seed — if it's missing, the link is wrong. Then check Back returns to the master lists, and that reloading the scoped URL keeps the scoping.
2. **The Items column** — the D2 caveat above. Compare a list's count against the number of rows the hand-off actually shows, ideally on a store whose visibility trims a list. If they disagree in a way that reads as a bug rather than a distinction, say so and we'll change the column.
3. **Column widths + resizing** — Name and Description now take the text preset and Items a 6rem call-site width. Drag all three; tune the Items width at the call site if "Items" crowds.
4. **The search chip** — present on arrival with no menu step, shrink-to-content, in the table's toolbar rather than the app bar; typing narrows and the URL keeps it across a reload.
5. **Empty state** — a store with no master lists still shows "No master lists to display." (and, if you click Export there, the deferred F4 banner in the header — that's the known one).
