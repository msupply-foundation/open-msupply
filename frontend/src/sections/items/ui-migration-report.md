# Items (Catalogue) — UI migration report

**Status: MIGRATION COMPLETE.** All code findings fixed, both spec edits signed off and applied, the one library reactivity bug fixed; `pnpm check` + `pnpm test` (870 tests) green, eslint 0 errors. **The visual pass is yours** — see [_Your visual pass_](#your-visual-pass-required--the-skill-cannot-sign-this-off). The audit findings are kept below as the record of what was found and why.

## Outcome

### Code fixes — all applied, all green

| Finding                         | Resolution                                                                                                                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R8** · tab-panel remount bug  | `.state` gates on all three tab panels' resources — opening Ledger / Ancillary / Variants for the first time no longer suspends the detail screen's boundary and remounts the whole page. Extended to the list + detail first-load reads (B1), so **nothing** on either screen suspends now |
| **RC1** · column arrays (dim 7) | all four `columns` builders → `createMemo` (KDD §14). **Found by the reactivity delegate, not the audit** — see [Corrections](#corrections-to-the-audit)                                                                                                                                    |
| **R1/R2** · filter placement    | both filter bars moved into `DataTable`'s `filters` slot (`tables.md:13`, binding); the ledger's inline-styled wrapper `<div>` deleted; the always-on controls kept, wrapped in `HStack gap="sm"` for rhythm (the slot sets no gap)                                                         |
| **R4** · ledger cell presets    | all 17 columns → `getCellDefinition` / explicit helper + width; `localisedDate`/`localisedTime`/`formatNumber` hand-formatting deleted; money columns now the currency preset; expiry gains the near-expiry tone                                                                            |
| **R5** · column widths          | presets on the list (`code`/`name`/`masterLists`/`unit`), master-lists (`code`/`name`/`description`) and ancillary (`name`/`code`) tables; explicit `size` on the five bespoke-cell columns                                                                                                 |
| **R6** · D55 dialog footers     | all three modals → icon-less `CancelButton` / `DialogSaveButton` / `SaveAndNextButton`; testids kept verbatim                                                                                                                                                                               |
| **R7** · empty-state wrappers   | the two `<Show when={rows().length}>` wrappers dropped; `DataTable` owns the empty treatment (headers stay visible, no "nothing here" flash during the first fetch); the ancillary create CTA moved to the table's `empty` slot                                                             |
| **R3** · inline flex            | ancillary ratio row → `HStack gap="sm"` (identical spacing, no hand-rolled flex). **Zero inline `style` left in the vertical**                                                                                                                                                              |
| **R10** · bare `<p>`s           | the two bundling empty states → `EmptyState graphic={false}`; the cannot-bundle caption → `Text variant="bodySmall"`                                                                                                                                                                        |
| **R11** · hand-rolled link      | the principal-variant `<A>` → `RecordLink` (no `kind` — the neutral reference)                                                                                                                                                                                                              |
| **R12** · duplicate cluster     | one `HeaderButtons` holding both per-tab `<Show>`s                                                                                                                                                                                                                                          |
| **R13** · heading outline       | the variant card's three `FormSection`s → `headingLevel="h3"` (they are sub-groups of the card's own `h2`)                                                                                                                                                                                  |
| **R14** · hand-written type     | `AncillaryRow` derived from `ItemAncillaryItemsResult`                                                                                                                                                                                                                                      |
| **R15** · `as` casts            | both narrowed via `INVOICE_TYPES.find(…)` / `INVOICE_STATUSES.find(…)` — a stale URL value is now rejected instead of asserted into the enum                                                                                                                                                |
| **R16** · missing hover         | `unitsWithDoses` returns `{ text, title }`; the truncated cell renders the full-precision value as its `title`, per `ui-surface.md:47`. The dead `truncated` flag is now load-bearing; **one new unit test** pins it                                                                        |
| **R17** · empty CTA variant     | variants empty state → `variant="ghost"`, icon-less, matching every sibling                                                                                                                                                                                                                 |
| **L1** · `Statistic` self-links | `href` made optional in the library (your call); the AMC and Months-of-stock stats drop it and render as plain text. **Two links that navigated nowhere are gone**                                                                                                                          |
| **B2 (part)** · testid          | the list search `items-search` → `filter-input-codeOrName`, the documented shared convention (`TESTIDS.md:124`/`:265`). No suite depends on it yet, so this was free to correct                                                                                                             |

### Library changes (both explicitly approved)

- **`Statistic.href` is optional** — [`Statistic.tsx`](../../ui/elements/dashboard/Statistic.tsx) renders a plain `<div>` with no link role, no tab stop and no `aria-label` when there's no drill-down; the hover underline and focus ring are scoped to `a.stat` so a non-interactive row never hints at a click. Registry row, `UI_ELEMENTS.md` and the Statistics showcase (a fifth no-href demo row) all updated.
- **The `Table` display shell is now a registered role** (J1) — "Static sub-table (small, inside a card or dialog)" in [`components.md` § Tables](../../../spec/ui-standards/components.md), with the boundary stated in three places: the registry row, a `tables.md` exception line, and the component's own doc comment. A screen's own row set stays a `DataTable` however few rows it holds. Demoed for real on the **Detail views** showcase — the second `DetailCard` now holds a `Table` packaging sub-table, which is what that demo's copy already promised but didn't show.

### Decisions taken (yours)

- **J1** — legitimise the `Table` shell rather than force `DataTable`'s toolbar chrome into three small in-card tables. Registry row + showcase example, as you asked.
- **J3** — **no change.** My framing was unclear: I recommended keeping `FormRow` + `LabelledValue`, and you're right that the showcase demos that family too, so there was no real conflict. L4 (a showcase-update task) is withdrawn.
- **J4** — keep the packaging grid's CSS module as a documented bespoke grid.
- **J2 (list) — fold the search into the chip bar.** Your ruling: the standalone "Enter item code or name" box is not a sanctioned component. The `codeOrName` search is now a `FilterBar` text-filter chip like every other filter, **seeded present** via `DEFAULT_STATE`'s `filter: { codeOrName: null }` — so it is there on arrival with no menu step, and `filter-input-codeOrName` now comes from `FilterBar` rather than being hand-stamped. This is exactly the shape the names lists already use, and for the documented reason: ui-surface asks for a dedicated search **field**, but that role is **⛔ not built** (`components.md` § Inputs → "Free-text search / filter"), so `FilterBar`'s text filter is the registry's sanctioned substitute. **No spec edit** — the spec still describes the intended always-present search field; when the ⛔ role is built, both verticals adopt it and the prose already fits.
- **J2 (ledger) — not yet done.** The Ledger tab's date-time range is the same class of problem and is still a control beside the bar. See [Library findings](#library-findings) — `FilterDateTimeRange` is built for chip context, so folding it in is the natural fix, but it is a separate change from the list.

## Coverage table — greened

Legend: ✅ clean · ✔ fixed this pass · ° = benign (noted) · — = N/A.

Dimensions: **1** C3/registry · **2** composition · **3** tables · **4** inputs · **5** forms/dialogs · **6** styling · **7** reactivity · **8** types · **9** a11y · **10** test hooks · **11** spec.

| Screen / file                     | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  |
| --------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| list/ItemsList.tsx                | ✅  | ✔   | ✔   | ✅  | —   | ✅  | ✔   | ✅  | ✅  | ✔   | ✅  |
| list/itemColumns.tsx              | ✅  | —   | ✔   | —   | —   | ✅  | —   | ✅  | ✅  | ✅  | ✔   |
| list/listFilters.tsx              | ✅  | —   | ✅  | ✅  | —   | ✅  | ✅  | ✅  | —   | ✅  | ✅  |
| list/itemFilter.ts · itemStats.ts | —   | —   | —   | —   | —   | —   | ✅  | ✅  | —   | —   | ✔   |
| detail/ItemDetailView.tsx         | ✅  | ✔   | ✔   | ✅  | ✅  | ✅  | ✔   | ✅  | ✔   | ✅  | ✔   |
| detail/itemDetailTabs.ts          | ✅  | ✅  | —   | —   | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/ItemLedgerPanel.tsx        | ✔   | —   | ✔   | ✅  | —   | ✔   | ✔   | ✔   | ✅  | °   | ✅  |
| detail/ItemAncillaryPanel.tsx     | ✅  | —   | ✔   | —   | ✅  | ✅  | ✔   | ✅  | ✅  | ✅  | ✅  |
| detail/ItemVariantsPanel.tsx      | ✅  | ✅  | —   | —   | ✔   | ✅  | ✔   | ✅  | ✅  | ✅  | ✅  |
| detail/ItemVariantCard.tsx        | ✔   | —   | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✔   | ✅  | ✅  |
| detail/ItemVariantEditModal.tsx   | ✅  | —   | ✅  | ✅  | ✔   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/BundledItemModal.tsx       | ✅  | —   | —   | ✅  | ✔   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/AncillaryItemEditModal.tsx | ✔   | —   | —   | ✅  | ✔   | ✔   | ✅  | ✔   | ✅  | ✅  | ✅  |
| index.tsx                         | ✅  | ✅  | —   | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| Spec docs (ui-surface.md)         | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | ✔   |

Every cell is clean or fixed. Implementation and spec are back in agreement, so the next `spec-build` reproduces this UI rather than re-introducing the drift.

## Corrections to the audit

Two things the audit got wrong, both surfaced while doing the work:

- **The audit missed RC1** (column arrays must be `createMemo`, KDD §14 — a binding rule, and the ledger's 17 columns are the KDD's own example scale). My dimension-7 pass found the `.latest` reads and stopped there. The `check-reactivity` delegate caught it on the diff, which is the delegate earning its place — but the audit should have found it, since it applies to all four items tables and the reference vertical had already hit it as its own R9.
- **SE2 and SE3 were unnecessary.** I claimed `ui-surface.md` needed rewording for the always-present search and date-range. Re-reading them, neither states a filter **location** — they state the filter _set_ and that those two are offered without a menu step, which is exactly what the code now does inside the table toolbar. Nothing to change. Withdrawn.

Also withdrawn: **L4** (the `DetailCard` showcase demo) — per J3, there was no real conflict.

## Spec edits — signed off and applied

Both were pure-UI drift where the current standards win, so the spec moved (your call on each).

- **SE1 — the statistics band's region.** § Layout put the band under "**Content**, top to bottom: statistics band · tab strip · active panel". It cannot go there: the tab strip claims the `Header`'s bottom edge, so a band in the content body would render _below_ the strip, contradicting the spec's own stated order. **Applied:** Layout now reads the app bar top-to-bottom — breadcrumbs + page actions · the statistics band in the page-content row · the tab strip claiming the bottom edge — and "Content" is just the active tab's panel. A `spec-build` reading this now reproduces the band where it belongs. (Your ruling: the statistics are good where they are, in the header.)
- **SE4 — master lists tab sorting.** The spec claimed the three columns were "each sortable client-side"; that is forbidden by [`tables.md`](../../../spec/ui-standards/tables.md#pagination--scale) and unavailable in `DataTable` (L2). **Applied:** the claim is replaced with _why_ nothing sorts — these rows arrive with the item record, not from a query carrying sort keys. The implementation was already correct; L2 stays deferred ("not happening right now").

## Library findings

**Fixed (your call):**

- **RC2 — `DataTable` read its `filters` prop twice.** [DataTable.tsx](../../ui/elements/table/DataTable.tsx): the toolbar did `<Show when={props.filters}><div…>{props.filters}</div></Show>`, and a JSX prop is a lazy getter — so the whole filter subtree was instantiated twice and one copy discarded, taking its signals, focus targets and debounce timers with it (KDD §3). Now resolved once via `children(() => props.filters)`. Pre-existing, so this also fixes stocktakes and every other `filters` consumer.
- **L1 — `Statistic.href`** made optional (see above).

**Flagged, not fixed:**

- **`FilterDateTimeRange` is built for a chip, used outside one.** Its own doc says the fields are "de-boxed onto the chip pill via `.bareField`" and that "FilterBar supplies `filter-input-<key>`", and it reads `useChipFocus()` — which is `undefined` outside a chip, so the focus hand-off silently no-ops. The ledger uses it standalone with a hand-written testid. It renders (no crash), but it is a component in a context it wasn't built for. **Disposition: bears on J2** — folding the range into a seeded chip would resolve it; otherwise the component needs a sanctioned standalone mode.
- **L2 — `DataTable` has no client-side sort mode.** Manual/controlled only ([DataTable.tsx:293-328](../../ui/elements/table/DataTable.tsx#L293-L328)), so a bounded detail table (master lists) can't offer sorting even where `tables.md`'s bounded-working-set exception would allow it. **Disposition: deferred**; resolved for now by SE4.
- **L3 — `FilterBar` has no always-on / non-removable chip.** Every chip is removable and only shows when its key is present, so "this filter is permanent" is inexpressible. Three verticals now hand-roll an always-on control beside the bar (items list, items ledger, the names lists). **Disposition: a library task if you want J2 resolved properly.**
- **L5** — resolved: the `Table` shell now has a registry row (J1).

## Boutique / uncovered elements

- **The numeric "units (n ds)" cell with precision-truncation** ([itemStats.ts](list/itemStats.ts)) — spec-owned, captured as-is from the reference app. **Tag (c): deliberate documented exception.** Now carries explicit widths and the spec'd hover.
- **The variant card's three static sub-tables** — **resolved**: no longer boutique, they fill the newly-registered static-sub-table role (J1).
- **The packaging editor grid** ([ItemVariantEditModal.module.css](detail/ItemVariantEditModal.module.css)) — **tag (c): deliberate documented exception** (J4). 21 lines, tokens only, no literals; the 2.5rem-level + three-equal-shares layout is not something a layout primitive expresses.
- **⛔ registry roles:** none needed. No new library component was required.

## Noticed during the work (not fixed)

- **`formatMonthsOfStock` doesn't apply the "…" truncation rule.** `ui-surface.md:47` states the rule for numeric cells generally, and MOS is one — but MOS is separately specified as 2 decimals (S2 band, AC-S2) and has a unit test pinning `2.5 → "2.50"`. Applying the ellipsis there would change displayed values and contradict AC-S2, so I left it. **Worth a ruling:** is the "…" rule MOS-exempt, or is AC-S2 the stale side?
- **B3** — no `cardGroups` / `compact` `columnVisibility` on either table, so below 600px the ledger's 17 columns render as a flat card. Same finding as the reference vertical's R11. Raise it if you want the ledger's card view addressed.
- **B2 (rest)** — `testId="filter-input-datetime"` on the ledger range names no URL parameter (the state is `from`/`to`); left alone since it's tied to J2. `items` still has no `TESTIDS.md` section and no e2e suite — that belongs with the future suite.
- **B5** — `{i().ddd}` renders unformatted where its neighbours use `formatUnits`. Cosmetic. (`{i().type}` is correct as-is: `ui-surface.md:95` specifies the raw enum.)

## Your visual pass (required — the skill cannot sign this off)

Static checks can't catch "compiles clean but looks wrong". Open each in **light and dark**:

| Screen                  | Route                                          | Compare against                                      | Watch for                                                                                                                                                                                                                         |
| ----------------------- | ---------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Items list**          | `/:storeId/catalogue/items`                    | `#/showcase/table`, `StocktakesList`                 | the filters now sit in the **table toolbar**, not the header — the search + chip bar rhythm at narrow widths; the new column widths (code/name/master-lists/unit) and whether they drag; the header now holds only the breadcrumb |
| **Item detail**         | `/:storeId/catalogue/items/:itemId`            | `#/showcase/header`, `#/showcase/page-layout`        | the stats band: **AMC and Months-of-stock are no longer links** (no hover underline, no focus ring, no pointer) while Stock-on-hand still is                                                                                      |
| **Ledger tab**          | `…/:itemId?tab=ledger`                         | `stock/detail/LedgerPanel`, `#/showcase/table`       | **the biggest visual change** — 17 columns re-widthed; money columns now show a **currency symbol**; a near-expiry date is now **red**; the date-range + chips in the table toolbar                                               |
| **Ancillary items**     | `…/:itemId?tab=ancillary`                      | `#/showcase/table`                                   | empty state now keeps the **column headers**; the Add CTA is a ghost button inside the table's empty slot                                                                                                                         |
| **Master lists tab**    | `…/:itemId?tab=master-lists`                   | `#/showcase/table`                                   | same: headers stay visible when empty                                                                                                                                                                                             |
| **Variants tab**        | `…/:itemId?tab=variants` (central only)        | **`#/showcase/detail-views`** (the new `Table` demo) | the card sub-tables against the newly-demoed shell; the empty state's ghost CTA; the two "No bundled items" `EmptyState`s; the cannot-bundle caption                                                                              |
| **All three modals**    | Add variant · Add bundled item · Add ancillary | `#/showcase/forms`                                   | **icon-less** Cancel / Save / Save & next; the ancillary ratio row's spacing (`HStack`, unchanged gap)                                                                                                                            |
| **Statistics showcase** | `#/showcase/statistics`                        | —                                                    | the new no-href demo row: plain text, no underline on hover                                                                                                                                                                       |

**First-open remount check (R8, the headline fix):** open the detail screen, then click Ledger, Ancillary items and Variants for the first time each. The page must **not** blank to a spinner or flicker — only the tab's own table shows its loading treatment. `detect-remounts` on those three interactions is the mechanical confirmation.

## Verify

- `pnpm check` green (types, stylelint, theme contract, page-CSS guard, browser floor).
- `pnpm test` green — **870 tests** (869 + the new hover assertion).
- `eslint` — 0 errors. The seven `solid/reactivity` warnings in the two edit modals are pre-existing and intentional (the documented "seed the form once from the `props.editor` snapshot" pattern); no new warnings introduced.
- `check-reactivity` on the working diff — clean after RC1; RC2 is the library item above.

---

## Appendix — the original audit findings

The detail behind each fix, kept as the record. `file:line` references are to the **pre-fix** code.

### R8 — Tab-panel resources read `.latest` alone (dim 7, the headline)

Three tab panels mount only when their tab is opened, so their resource's **first** read is pending, and each read `.latest` directly: `ItemLedgerPanel.tsx:226-227`, `ItemAncillaryPanel.tsx:45`, `ItemVariantsPanel.tsx:40`. The nearest boundary is `ItemDetailView.tsx:130`'s screen-wide `<Suspense>`, so the first open of each tab blanked and remounted the entire detail screen. Root `CLAUDE.md`'s anti-default names this exact case: `.latest` alone is not safe, gate on `.state`. The in-vertical reference was already correct in the two write modals.

### R1 — Filter bars outside the table (dims 3/2)

`tables.md:13` is binding: the filter bar MUST render in the table's toolbar, "and overrides any vertical spec that places filters elsewhere". The list packed search + chips into the page `Header`'s `<Toolbar>` (`ItemsList.tsx:162-183`); the ledger used a hand-rolled band (`ItemLedgerPanel.tsx:337-365`). Neither `DataTable` was given `filters`. Same finding the reference vertical fixed as its R10.

### R4/R5 — Cell presets and widths (dim 3)

The ledger's 17 columns carried no preset and no width, hand-formatting dates via `localisedDate`, numbers via `formatNumber`, and money via `formatNumber` with hard-coded 2-dp options, re-declaring `align: 'right'` seven times. The sibling `stock/detail/LedgerPanel.tsx` — same table shape — was already fully converted, making items the internally-inconsistent outlier. The list, master-lists and ancillary tables carried no widths either.

### R6 — Dialog footers (dim 5)

All three modals hand-rolled icon-bearing footers (`XCircleIcon` Cancel, `CheckIcon` Save, `ArrowRightIcon` Save & next) against `controls.md:70-72` (D55): the standard buttons, icon-less, "a dialog footer is read as verbs in a fixed position, not a toolbar".

### R7 — Empty-state wrappers (dim 3)

`<Show when={rows().length > 0} fallback={<EmptyState/>}>` around two `DataTable`s meant that when empty the table wasn't rendered at all — no column headers, and (since `rows()` is empty while the first fetch is pending) the empty state showed _instead of_ the spinner. `tables.md` § Empty & loading requires the header row to stay visible and the empty state to appear "only once a settled fetch returns zero rows".

### R16 — The dropped hover (dims 3/11)

`itemStats.ts:48-61` computed the right `{ text, truncated }` pair, but `unitsWithDoses` returned only the string, so `truncated` was dead and no `title` was ever set — "666.67…" appeared with no way to see the full value, against `ui-surface.md:47`. Spec-owned behaviour, so the spec won and the implementation was fixed.

### The rest

**R3** ancillary ratio inline flex · **R10** three bare `<p>`s · **R11** hand-rolled `<A>` for a related record · **R12** two `HeaderButtons` clusters in one `Header` · **R13** `FormSection`s at `h2` under the card's own `h2` · **R14** `AncillaryRow` hand-written · **R15** two `as` casts on stale-URL-sourced values · **R17** primary+icon empty CTA where every sibling uses ghost.
