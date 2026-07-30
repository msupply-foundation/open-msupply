# Outbound shipments — UI migration report

Audit of the whole `outbound-shipments` vertical against the eleven dimensions in [`MIGRATING_A_VERTICAL.md`](../../ui/docs/MIGRATING_A_VERTICAL.md). Judged against the rules, the [component registry](../../../spec/ui-standards/components.md), the binding [side-panel contract](../../ui/docs/SIDE_PANEL.md), the reference vertical (`src/sections/stocktakes/`), and the sibling verticals that fill the roles stocktakes lacks (inbound shipments, supplier/customer returns, internal orders, prescriptions, names).

**Status: migrated and verified — `pnpm check` green, `pnpm test` green (1094 tests), and rendered + driven against a live server. The operator's visual pass is outstanding.**

Scope confirmed with the operator: the whole vertical. Branch: `fix/outbound-side-panel-closed-by-default`.

Three of the sibling audits already name outbound as a known leftover, so some findings here arrive pre-diagnosed: [inbound F1](../inbound-shipments/ui-migration-report.md) (the list's inline-styled name cell → LIB-3), [supplier-returns F6](../supplier-returns/ui-migration-report.md) (delete tone), and supplier-returns F2's note (the hand-rolled detail header, which it fixed for itself).

## Coverage table

Rows are the vertical's screens and composed pieces; each cell is `✅` or the finding count for that dimension. Dimensions: 1 registry/C3 · 2 screen composition · 3 tables · 4 inputs · 5 detail/side panel · 6 styling · 7 reactivity · 8 types · 9 a11y · 10 test hooks · 11 spec consistency.

| Screen / piece                                    | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  |
| ------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **L1** List screen                                | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **L2** List filters                               | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **L3** Customer-search modal                      | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **L4** List actions (Delete · Duplicate · Export) | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D1** Detail view shell                          | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D2** Detail header cluster                      | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D3** Detail line table + filters                | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D4** Side panel                                 | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D5** Picked-date field                          | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D6** Status footer                              | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D7** Log tab                                    | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D8** Detail actions (×6)                        | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D9** Custom-fields tab                          | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **M1** Line-edit modal (+ CSS module)             | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |

`—` = the dimension has no surface on that piece. Every finding below was fixed; the three judgment calls were ruled by the operator (see [Decisions](#decisions)). The pre-fix counts are kept in each finding.

**Clean dimensions across the whole vertical: 7 (reactivity), 9 (a11y), 10 (test hooks).** Notes on why below. Dimension 8 has one pattern, dimension 11 two — both narrow.

## Findings

### F1 — Inline `style` building layout or weight (dim 1 C3, dim 6) · 7 sites

**Rule:** [reach-for order](../../ui/docs/MIGRATING_A_VERTICAL.md#the-reach-for-order) step 5 — an inline `style` is always a finding; layout built from one is also C3 ([Layout › horizontal stack](../../../spec/ui-standards/components.md#layout)). `HStack` carries `gap` / `align` / `justify` / `wrap`; `Stack` is the vertical run.

| Site                                                                                | Now                                                                        | Fix                                                              |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [OutboundShipmentsList.tsx:216](list/OutboundShipmentsList.tsx#L216)                | `<span style={{display:'inline-flex',…}}>` around the colour swatch + name | `<HStack gap="sm">` — inbound fixed the identical cell (its F1)  |
| [PickedDateField.tsx:157](detail/PickedDateField.tsx#L157)                          | inline-flex row, field + reason bubble                                     | `<HStack gap="sm">`                                              |
| [PickedDateField.tsx:169](detail/PickedDateField.tsx#L169)                          | `display:grid; width:'8rem'` wrapper capping the `DateField`               | `DateField width=…` — the prop exists (`compact`/`short`/`full`) |
| [OutboundSidePanel.tsx:119](detail/OutboundSidePanel.tsx#L119)                      | `groupHeading()` — inline-flex + `font-weight` bold                        | subsumed by **F9**                                               |
| [OutboundSidePanel.tsx:379](detail/OutboundSidePanel.tsx#L379)                      | Grand-total label wrapped in a bold `<span>`                               | **decision D1** — no standard total row exists yet               |
| [OutboundLineEditModal.tsx:1373](detail/edit-modal/OutboundLineEditModal.tsx#L1373) | flex row, `justify-content:end`, for the grid footer totals                | `<HStack justify="end" gap="lg">`                                |
| [OutboundLineEditModal.tsx:1392](detail/edit-modal/OutboundLineEditModal.tsx#L1392) | flex column for the stacked warning banners                                | `<Stack gap="sm">`                                               |

Two of these use a **token** in the inline style (`var(--space-2)`), so they're not colour-literal violations — the finding is the inline `style` itself and the hand-rolled layout.

### F2 — The detail header is a hand-rolled `Toolbar` + `FieldRow`s, not `HeaderToolbar` (dim 2, 1, 4)

[OutboundDetailView.tsx:804-878](detail/OutboundDetailView.tsx#L804).

**Rule (binding, in the registry's own words):** [Screen structure › app bar — page content](../../../spec/ui-standards/components.md#screen-structure-regions) — "a detail screen's header fields use `HeaderToolbar`, which fixes their layout (each field labelled above its control, equal shares wrapping as a unit) **so every detail header reads alike** — `Toolbar` stays for other content (a list's filter bar)". Outbound instead stacks two `FieldRow`s (inline label, `hideLabel` on the control) inside the generic `Toolbar`.

**Outbound is now the only detail view left with this drift.** The reference vertical and every migrated sibling have a `<Vertical>Toolbar.tsx` over `HeaderToolbar`: [`StocktakeDetailToolbar`](../stocktakes/detail/StocktakeDetailToolbar.tsx), [`InboundShipmentDetailToolbar`](../inbound-shipments/detail/InboundShipmentDetailToolbar.tsx), [`SupplierReturnToolbar`](../supplier-returns/detail/SupplierReturnToolbar.tsx), [`CustomerReturnToolbar`](../customer-returns/detail/CustomerReturnToolbar.tsx), [`PrescriptionToolbar`](../prescriptions/detail/PrescriptionToolbar.tsx), `patients`. (`internal-orders` also still drifts — a separate sweep.)

**Fix:** extract `OutboundToolbar.tsx` on `HeaderToolbar`, each field labelled above a `size="small"` control; pass `layout="field"` to `CustomFieldsToolbar` (the prop exists for exactly this host, [CustomFieldsToolbar.tsx:26](../../domain/customFields/CustomFieldsToolbar.tsx#L26)). The customer lookup keeps its disabled gates and inline error.

### F3 — The line-table item search is a bare `FilterTextInput` beside the `FilterBar` (dim 3, 1)

[OutboundDetailView.tsx:862](detail/OutboundDetailView.tsx#L862) renders a standalone `FilterTextInput` next to the `FilterBar`, with a comment claiming it matches "the stocktakes detail".

**That comment is now stale.** [#808](https://github.com/msupply-foundation/open-msupply-frontend/pull/808) (merged to `main` today) added `alwaysOn` to `FilterBar` filters precisely so a default search lives **as a chip in the bar** — "so a page needs no default-filter bookkeeping of its own" ([FilterBar.tsx:65](../../ui/elements/selectors/FilterBar.tsx#L65)). The reference vertical moved with it: [`stocktakeDetailFilters.tsx:47`](../stocktakes/detail/stocktakeDetailFilters.tsx#L47) — `alwaysOn: true` wrapping a `FilterTextInput`, commented "both chips in the table toolbar's FilterBar". Dimension 3 states the rule outright: "filters as `FilterBar` chips (never a separate always-on search box beside the bar)".

The spec agrees and needs no edit — S3 § Line-table filters already distinguishes "**Item search** (always-on toolbar search)" from "**Location** (addable filter chip)", which is exactly `alwaysOn: true` vs a normal chip.

**Fix:** fold the item search into [`outboundDetailFilters.tsx`](detail/outboundDetailFilters.tsx) as an `alwaysOn` text filter; delete the standalone input.

### F4 — Both `FilterBar`s render in the page header, not the table's own toolbar (dim 2, 3)

[OutboundShipmentsList.tsx:317](list/OutboundShipmentsList.tsx#L317) and [OutboundDetailView.tsx:873](detail/OutboundDetailView.tsx#L873) put the bar in a `<Toolbar>` inside `<Header>`.

**Rule:** `DataTable`'s own `filters` prop — "the table's toolbar — filters live WITH the table, not the page header" ([DataTable.tsx:120](../../ui/elements/table/DataTable.tsx#L120)), citing ui-standards § tables. Three verticals agree, including the reference: [`StocktakesList.tsx:342`](../stocktakes/list/StocktakesList.tsx#L342) ("Filters live in the table's own toolbar … never the page header"), [`StocktakeDetailView.tsx:950`](../stocktakes/detail/StocktakeDetailView.tsx#L950), [`InboundShipmentsList.tsx:419`](../inbound-shipments/list/InboundShipmentsList.tsx#L419), [`SupplierReturnsList.tsx:394`](../supplier-returns/list/SupplierReturnsList.tsx#L394) (its F15).

**Fix:** pass both bars as `DataTable filters={…}`; the detail's `<Toolbar>` keeps the header fields (which become **F2**'s `HeaderToolbar`).

### F5 — No column-width presets on any of the four tables (dim 3)

**Zero `getCellDefinition` calls in the vertical.** Every typed column spreads a bare helper, which sets no `size`, so the column renders at a wrong default width and can't be dragged sensibly. Widths live per key in [`_globalColumnConfig.ts`](../../ui/elements/table/_globalColumnConfig.ts); nine verticals have adopted the presets.

| Table                                                                      | → `getCellDefinition(key)`                                                                                  | No preset key → helper + call-site `size` |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **L1** list                                                                | `invoiceNumber`, `createdDatetime`, `comment`, `theirReference`, `otherPartyName`                           | `status`, `totalAfterTax`                 |
| **D3** detail lines                                                        | `itemCode`, `itemName`, `batch`, `expiryDate`, `packSize`, `numberOfPacks`, `sellPricePerPack`, `lineTotal` | volume / on-hold / doses columns          |
| **D7** log                                                                 | `date`, `time`, `user`                                                                                      | `event` (wrapping text)                   |
| **M1** batch grid                                                          | `batch`, `expiryDate`, `packSize`, `availableNumberOfPacks`, `sellPricePerPack`                             | issue / doses / FC-price columns          |
| Exact key list to be settled against `_globalColumnConfig.ts` when fixing. |                                                                                                             |                                           |

**Watch the `unit` vs `unitName` trap** supplier-returns hit (its F7): `unitName`'s preset is narrower than the header word itself. Use `unit`.

### F6 — Dialog footers ignore `StandardButtons` and D55 (dim 5, dim 1) · 15 footers across 9 dialogs

**Rule:** registry [Modal footer button](../../../spec/ui-standards/components.md#buttons--status) → `CancelButton` / `DialogSaveButton` / `OkButton`, "never OK/OK & next, **never an icon**"; [D55](../../../spec/DIVERGENCES.md) is binding and applied app-wide. Only the line-edit modal uses the pre-composed buttons today ([OutboundLineEditModal.tsx:1215](detail/edit-modal/OutboundLineEditModal.tsx#L1215)); every other footer hand-rolls `Button variant="secondary"` + an icon, which also makes the confirm **secondary** where `OkButton` is `primary`.

Sites: [OutboundDetailView.tsx:724](detail/OutboundDetailView.tsx#L724), [:1087](detail/OutboundDetailView.tsx#L1087) · [CustomerSearchModal.tsx:89](list/CustomerSearchModal.tsx#L89) · [AddFromMasterListAction.tsx:110,122](detail/actions/AddFromMasterListAction.tsx#L110) · [AllocateLinesAction.tsx:239,250,259](detail/actions/AllocateLinesAction.tsx#L239) · [StatusChangeAction.tsx:264,278,300](detail/actions/StatusChangeAction.tsx#L264) · [DeleteShipmentAction.tsx:89,99,108](detail/actions/DeleteShipmentAction.tsx#L89) · [DeleteShipmentsAction.tsx:74,143,151,164,173](list/actions/DeleteShipmentsAction.tsx#L74) · [DuplicateShipmentAction.tsx:140,157,167,176](list/actions/DuplicateShipmentAction.tsx#L140).

**Fix:** `OkButton` / `CancelButton` / `DialogSaveButton`, keeping each site's existing `data-testid` (the wrappers pass rest props through and stamp none of their own). Non-standard verbs — "Release hold & confirm ‹status›", "Allocate", "Next" — stay a plain `Button`, icon dropped per D55. Dialog **title** icons stay: D55 covers footer actions.

### F7 — Destructive confirms aren't `danger` (dim 5)

Dimension 5: "button-variant semantics (delete = `danger`)"; registry `ConfirmDialog`: "`danger` for a destructive action". [DeleteShipmentAction.tsx:60](detail/actions/DeleteShipmentAction.tsx#L60), [DeleteLinesAction.tsx:45](detail/actions/DeleteLinesAction.tsx#L45), [DeleteShipmentsAction.tsx:52](list/actions/DeleteShipmentsAction.tsx#L52) and their confirms are all `secondary`. The reference ([`DeleteStocktakesAction.tsx:51`](../stocktakes/list/actions/DeleteStocktakesAction.tsx#L51)), inbound and supplier-returns all use `danger` — and [supplier-returns F6](../supplier-returns/ui-migration-report.md) explicitly logged outbound as the remaining one.

### F8 — The footer Close is icon-only where the house pattern is a labelled `CloseButton` (dim 1, 2, 11)

[OutboundStatusFooter.tsx:111](detail/OutboundStatusFooter.tsx#L111) renders an icon-only `IconButton`.

**This is the direction supplier-returns' audit got backwards and had reversed** (its F10): the design owner asked for "a proper Close button back" (2026-07-30), the full sibling count is **4 labelled vs 2 icon-only** (customer-returns, internal-orders, prescriptions, supplier-returns vs inbound, outbound), and the reference vertical has no footer Close to arbitrate. A **pre-composed `CloseButton` now exists** for it ([StandardButtons.tsx:50](../../ui/elements/buttons/StandardButtons.tsx#L50)), created from that ruling and carrying the note that the icon-only form was "the rejected alternative".

**Fix:** `<CloseButton onClick={…} data-testid="close-button" />` (level 1 on the reach-for order). Needs the **spec edit** below; inbound has the same drift (separate sweep).

### F9 — Side-panel group headings are bold `FieldRow` labels, not `SidePanelSubheading` (dim 5, dim 11)

[OutboundSidePanel.tsx:118-130](detail/OutboundSidePanel.tsx#L118) builds a `groupHeading()` span (inline-flex, bold) used as the `label` of a `FieldRow` for **Service charges** ([:283](detail/OutboundSidePanel.tsx#L283)) and **Items sell price** ([:334](detail/OutboundSidePanel.tsx#L334)) — the latter with an empty `<span />` as its value.

**Rule (binding, and the exact anti-pattern it names):** [`SIDE_PANEL.md`](../../ui/docs/SIDE_PANEL.md) rule 1 — "Group headings use `SidePanelSubheading` — **never** a `FieldRow` with a bold label. Pass an `action` for a group-level edit; use the info-tooltip-after-heading pattern when the group needs a gloss." The vertical's own spec names the role too: S3 § side panel says "**Service charges** — **group heading** with an info bubble … and the edit action". The migrated twin already conforms: [`InboundShipmentSidePanel.tsx:308,338`](../inbound-shipments/detail/InboundShipmentSidePanel.tsx#L308).

**Fix:** `SidePanelSubheading` with the edit `IconButton` in its `action` slot; the info tooltip moves **after** the text per the contract's recipe (outbound currently puts it before). Use `HStack gap="sm"` for the text+tooltip pair, not the doc recipe's inline `style` (see **LIB-1**).

⚠️ **See decision D2 before this lands** — it is adjacent to the inbound charges-heading work the spec owner rejected on 2026-07-30.

### F10 — The calculated tax amount floats beside its input instead of being its `helperText` (dim 5)

[OutboundSidePanel.tsx:345-371](detail/OutboundSidePanel.tsx#L345) puts the tax `NumberField` and `money(taxAmount(…))` in an `HStack`.

**Rule:** [`SIDE_PANEL.md`](../../ui/docs/SIDE_PANEL.md) rule 3 — "A calculated figure that belongs to an input is its `helperText` (sits below the input), never a value floated to the right of the row — that breaks the value-alignment column", with a copy-this recipe. The panel's CSS already styles a helper row's label to centre on the input, and renders panel helper text non-muted, so the treatment exists and is unused here. The twin does it: [`InboundShipmentSidePanel.tsx:323,374`](../inbound-shipments/detail/InboundShipmentSidePanel.tsx#L323).

### F11 — The side-panel comment is a single-line `TextField` where the contract and the spec both say multi-line (dim 4, dim 5, dim 11)

[OutboundSidePanel.tsx:205](detail/OutboundSidePanel.tsx#L205). [`SIDE_PANEL.md`](../../ui/docs/SIDE_PANEL.md) rule 2: "Multi-line text (a comment) is a `TextArea` (`width="full"`, no size)", with a recipe. The vertical's spec S3 § side panel says "comment (**multi-line**)" — so this is also spec-owned content where the spec wins. Twin: [`InboundShipmentSidePanel.tsx:249`](../inbound-shipments/detail/InboundShipmentSidePanel.tsx#L249). Supplier-returns fixed the identical finding (its F11).

**Fix:** `TextArea width="full"`, keeping `data-testid="comment-field"` (the e2e suites type into it).

### F12 — The side-panel tax `NumberField` sets no `width` (dim 5)

[OutboundSidePanel.tsx:347](detail/OutboundSidePanel.tsx#L347) is `size="small"` but unbounded. [`SIDE_PANEL.md`](../../ui/docs/SIDE_PANEL.md) rule 2: a **short value** (a percentage) is `width="compact"` — "the narrowest cap". Same for the `DateField` in **F1**'s row.

### F13 — The line editor's variant table hand-rolls a `<table>` (dim 1 C3, dim 3)

[OutboundLineEditModal.tsx:112-150](detail/edit-modal/OutboundLineEditModal.tsx#L112) (`VariantInfoTable`) builds `<table>/<thead>/<tbody>/<td>` over four bespoke CSS classes.

**Rule:** the library's `Table` display shell exists for exactly this and says so — "WHEN TO USE IT (registry § Tables → the **Static sub-table** role): a SHORT, FIXED row set presented INSIDE another surface — a DetailCard's sub-table, **a dialog's read-only block** — where DataTable's toolbar chrome would outweigh the content" ([Table.tsx:13](../../ui/elements/table/Table.tsx#L13)), with data-attribute cell conventions replacing the hand-written padding/border rules.

**Fix:** compose `Table label={…}` with plain `<thead>/<tbody>`; drop `.variantTable`, `.variantTable th`, `.variantTable td`, and keep only the marker-column width. (`internal-orders/detail/InternalOrderIndicatorsTab.tsx:161` hand-rolls one too — a separate sweep.)

### F14 — Hand-rolled flex in the modal's CSS module where `HStack`/`Stack` fit (dim 1, dim 6)

[OutboundLineEditModal.module.css](detail/edit-modal/OutboundLineEditModal.module.css):

| Class              | Verdict                                                                                                                                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.issueGroup` (33) | **REAL** — plain `flex` + `align-items:end` + `gap`, no per-child basis → `<HStack align="end" gap="lg">`                                                                                                                                                               |
| `.batchCell` (62)  | **REAL** — inline-flex + centre + gap in a table cell → `<HStack gap="sm">` (inbound's F1 fix established HStack inside a cell)                                                                                                                                         |
| `.headerRow` (6)   | **BENIGN, justified** — the D76 wrapping row needs a **two-axis** gap (`--space-3 --space-4`) and per-child flex bases (`.itemField` `0 1 32rem`, `.placeholderNotice` `1 1 20rem`); `HStack`'s gap is a single preset and it has no per-child control. Level 4 stands. |
| `.batchGrid` (53)  | **BENIGN, justified** — the documented `min-block-size` floor that stops the grid collapsing to 0 in a short landscape dialog. No component covers it.                                                                                                                  |
| `.available` (25)  | **BENIGN** — a 0.55rem optical nudge. Bespoke, token-less but not a colour/size literal in the stylelint sense; flagged, not fixed.                                                                                                                                     |

### F15 — `as Column<…>` casts (dim 8) · 9 sites

[OutboundLineEditModal.tsx](detail/edit-modal/OutboundLineEditModal.tsx) ×6 and [OutboundDetailView.tsx](detail/OutboundDetailView.tsx) ×3, all on conditionally-spread column objects. **Zero occurrences** across stocktakes, inbound and supplier-returns, so this is an outbound-only pattern rather than a house one; `kdd/type-safety` keeps `as` for trusted layers. Worth an attempt to remove by typing the array element (or the conditional spread) instead — **if it can't be removed cleanly it becomes a documented exception, not a forced change.**

### F16 — The Log tab combined Date and Time where every other log surface splits them (dim 3, cross-vertical consistency)

[LogTab.tsx](detail/LogTab.tsx) rendered one `Date/time` column. **Found after the main fixes had landed**, by re-checking a claim in this report's own first draft — the initial audit under-counted the sibling surfaces and mis-triaged the split as a content change.

**The house pattern is unanimous:** the shared [`ActivityLogPanel`](../../domain/activityLog/ActivityLogPanel.tsx) (used by items, patients, prescriptions, stock) and all six hand-rolled log surfaces (inbound, stocktakes, internal orders, supplier returns, customer returns) render **Date · Time · User · Event**, and so does the current app's `ActivityLogList` — the same `datetime` field shown twice, formatted two ways. Outbound was the only one of seven combining them. Splitting one field across two columns is presentation, not a change of content, so it was in scope all along.

**Fixed:** two columns on the `date` and `time` presets. The Event column keeps folding the log's `to` value into its label; adding the **Details** column that four of the seven carry would be a genuine content change, so it is left for a spec-owner ruling.

**F16 then broke the tab, and the operator found it.** Copying inbound's line verbatim gave `accessor: row => localisedTime(row.datetime)` **plus** `getCellDefinition('time')` — and [`getTimeCell`](../../ui/elements/table/tableHelpers.tsx#L127) calls `localisedTime` on the cell value itself, so it formatted an already-formatted clock string and threw `RangeError: Invalid time value`, killing the table body and leaving an endless spinner. Fixed by handing the cell the **raw** `datetime` and letting the preset format it.

Three patterns are in use across the app's time columns; only two work:

| Pattern                                                        | Verdict                                                                                      |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| raw accessor + `getCellDefinition('time')`                     | ✅ the cell formats once — customer-returns, items ledger, stock ledger, repack, VVM history |
| pre-formatted accessor + `meta: { align: 'right' }`, no preset | ✅ the string renders as-is — stocktakes, internal orders, the shared panel                  |
| pre-formatted accessor **+** `getCellDefinition('time')`       | 💥 double format → `Invalid time value`                                                      |

**Two siblings are in the broken combination on `main` today** and their Log tabs will spinner the same way: [`InboundShipmentLogPanel.tsx:134`](../inbound-shipments/detail/log/InboundShipmentLogPanel.tsx#L134) and [`supplier-returns/detail/LogTab.tsx:83`](../supplier-returns/detail/LogTab.tsx#L83). Not fixed here — outside this vertical — and raised with the operator. → **LIB-7**.

**The verification lesson:** the live pass drove the list, the detail header, the filter chip and the side panel, but never clicked the Log tab, so a crash in the one tab I had just rewritten went out the door. Changing a surface means rendering _that_ surface, not just the ones the change was about.

**The process lesson:** the audit's sibling sweep stopped at the first two agreeing verticals — the exact failure mode [supplier-returns' F10](../supplier-returns/ui-migration-report.md) recorded ("a cross-vertical check that stops at the first agreeing pair isn't a majority"). Repeating it here says the sweep has to be exhaustive by default.

**Also noted, not changed:** six verticals hand-roll a log surface rather than consuming the shared panel, each with its own query — a consolidation task well beyond this migration, flagged as **LIB-6**.

### F17 — F5 pinned the detail Batch column at the `code` kind's growth cap (dim 3)

Reported by the operator after F5 landed: Batch in the outbound detail table couldn't be dragged wider, while inbound's could.

**Measured, both tables at 1600×950:** outbound Batch renders at **112px**, which is exactly the `code` kind's `maxSize: 7rem` — a **hard** cap, so the column sits on the wall with nowhere to go. Inbound Batch renders at **80px** (`size: 5rem`), 32px clear of the same cap. Both use `getCellDefinition('batch')`, so the preset isn't the difference — the **content** is: outbound's accessor renders the word **"Placeholder"** for an unallocated line ([OutboundDetailView.tsx](detail/OutboundDetailView.tsx)), and auto-layout grows the column to fit it, straight into the cap. Inbound's cell holds a batch code only.

The repo had already recorded this failure mode for a sibling key: `locationCode` carries "Own size, NO cap" precisely because "the kind's 7rem growth cap would stop a user widening it to fit on one line (#601)".

**Fixed** at the call site, as `_globalColumnConfig`'s own header instructs ("for a one-off tweak in one table, override size/maxSize inline on that column def"): a local `uncapped()` helper drops the preset's `maxSize` while keeping its cell and width floor. Verified by re-measuring — the column now renders **118px**, past the former ceiling, so the cap is genuinely gone.

**Not fixed, needs a ruling — this is a shared-config question.** The `code` kind's cap is commented "a real cap, per the batch case", i.e. it was chosen _for_ batch columns. Two consequences:

- **Inbound will hit the same wall** as soon as a batch code is long enough to push its column to 7rem; it is merely 32px further from it today. Every `code` column in every vertical shares this.
- Outbound's **Item code** column is at 94px against the same 112px cap — 18px of drag room, which will read as "barely resizable" too.

So either the cap is right and outbound's Batch is the exception (what I've implemented), or the cap is too tight for code columns generally and belongs at `maxSize: null` in the shared config. That is a library change touching eight-plus tables → **LIB-8**.

**Caveat on the verification.** I could not drive the drag end-to-end: synthetic mouse drags on the resize handle moved nothing in _either_ table, including on uncapped control columns (Expiry, Pack size), so the harness — not the app — is what failed there. The cap evidence above is measurement, not a simulated drag. **Confirm by hand** that Batch now drags freely.

## Dimensions that are already clean

**7 — Reactivity.** The two resources that first fetch on an **interaction** — the Log tab ([LogTab.tsx:39](detail/LogTab.tsx#L39)) and the master-list picker ([AddFromMasterListAction.tsx:63](detail/actions/AddFromMasterListAction.tsx#L63)) — both use the `.state === 'ready' || 'refreshing'` gate the root `CLAUDE.md` requires. The `.latest`-alone reads (detail node, lines, service lines, locations; list rows) all belong to resources whose first fetch coincides with the screen's own first load, which is the sanctioned boundary, and each carries a comment saying so. The post-fix [`check-reactivity`](../../../.claude/skills/check-reactivity/SKILL.md) run over the diff found nothing — see [Reactivity re-check](#reactivity-re-check).

**9 — Accessibility.** Icon-only controls carry `label`; the variant marker has `role="img"` + `aria-label`; the selected variant row uses `aria-current`; the disabled-with-reason bubble is keyboard-reachable (`InfoTooltip` opens on focus). Nothing conveys meaning by colour alone. Contrast is a visual-pass item.

**10 — Test hooks.** Every id in the outbound block of [`e2e/TESTIDS.md`](../../../e2e/TESTIDS.md) (lines 190-204) resolves — including `service-charges-modal` and `add-charge-button`, supplied by the shared [`ServiceChargesModal`](../../domain/invoice/ServiceChargesModal.tsx#L314). The `dialog-button-ok` / `-cancel` ids are hand-stamped, which is correct (`StandardButtons` stamp none), so **F6** carried them across.

## Spec edits — signed off and made

One, from **F8**. [`spec/outbound-shipments/ui-surface.md`](../../../spec/outbound-shipments/ui-surface.md) S3 § Layout described the footer's Close as an **icon-only button**, which a labelled `CloseButton` contradicts — so the next `spec-build` would have put the glyph back. A **pure-UI** conflict → standards win, the spec moves.

**Made:** the Close entry now reads **Close** ([labelled action button](../../../spec/ui-standards/components.md#buttons--status)); the bullet names the action and its key, not a glyph. No `DIVERGENCES.md` entry implied — this isn't a deliberate difference from the reference app, just presentation the vertical's spec shouldn't have pinned. (Mirrors [supplier-returns' edit](../supplier-returns/ui-migration-report.md).)

**Nothing else needed one.** F3's "always-on toolbar search", F9's "group heading" and F11's "comment (multi-line)" were already what the spec said — the implementation was what had drifted, so all three fixes converged the code to the spec.

## Decisions — all three ruled by the operator (2026-07-30)

1. **D1 — Grand-total row: class swap only, no visual change.** `SIDE_PANEL.md` § Known open items leaves this treatment unsettled, so the migration did not invent one. The inline `style` moved to `.totalLabel` in a new `OutboundSidePanel.module.css`; the row still bolds its label and not its value, exactly as before. Picking the standard (and whether to promote a shared total row) stays open for the side-panel design spec.
2. **D2 — F9 goes ahead.** Group headings are now `SidePanelSubheading`. Verified live: the two `<h3>`s render ruled and full-width with the ⓘ after the text and the pencil at the heading's inline-end. See the density note below — the thing this decision was flagged for.
3. **D3 — Export/Print stays `secondary`.** Unchanged, pending the app-wide ruling; outbound would otherwise show two filled primaries beside Add item on an editable shipment.

## What was done

Fixed in the order L1 → L3/L4 → D1/D2/D3 → D4/D5/D6/D7/D8 → M1, each step typechecked.

| Finding    | What it became                                                                                                                                                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1** ×7  | 5 → `HStack`/`Stack`; the `DateField` cap → `width="compact"`; the Grand-total label → `.totalLabel` (D1). **Zero inline `style` left in the vertical.**                                                                                                    |
| **F2**     | New [`OutboundToolbar.tsx`](detail/OutboundToolbar.tsx) — the customer lookup, customer reference and `CustomFieldsToolbar layout="field"` as `HeaderToolbar` children. Verified live: labels sit above their controls in one wrapping row.                 |
| **F3**     | The item search is now an `alwaysOn` chip in [`outboundDetailFilters.tsx`](detail/outboundDetailFilters.tsx), rendering `filter-input-itemCodeOrName` — copied from the reference vertical's post-#808 shape. The standalone `FilterTextInput` is gone.     |
| **F4**     | Both bars moved to `DataTable filters={…}`. Verified live: no filter chrome inside `<header>`; the bar sits above the table.                                                                                                                                |
| **F5**     | `getCellDefinition` on all four tables. Unkeyed columns take a call-site `size`: line volume 7rem, log Date/time 11rem, log Event 12rem, list Status 7.5/9.375rem. `unit` (not `unitName`) and `location` (not `locationCode`) chosen by their **headers**. |
| **F6** ×15 | `OkButton` / `CancelButton` throughout, testids carried across; non-standard verbs ("Release hold & confirm", "Delete") stay a plain `Button` with the icon dropped per D55.                                                                                |
| **F7**     | The three delete triggers and both destructive confirms → `variant="danger"`; the confirm's label is now **Delete**, not OK.                                                                                                                                |
| **F8**     | `CloseButton` in the status footer, `data-testid="close-button"` unchanged, + the spec edit above.                                                                                                                                                          |
| **F9–F12** | Side panel: `SidePanelSubheading` group headings (ⓘ after the text, pencil in the `action` slot); the tax amount is the rate input's `helperText`; the comment is a `TextArea`; the tax field is `width="compact"`.                                         |
| **F13**    | `VariantInfoTable` composes the library's `Table` shell with `data-check` on the marker column; four bespoke CSS rules deleted.                                                                                                                             |
| **F14**    | `.issueGroup` → `HStack align="end"`, `.batchCell` → `HStack gap="sm"`. `.headerRow`, `.batchGrid` and `.available` stay, justified in the finding.                                                                                                         |
| **F15** ×9 | All nine `as Column<…>` casts became `satisfies Column<…>` — the assertions are gone and the objects are still checked.                                                                                                                                     |

**One defect I introduced and caught before finishing:** `SidePanelSubheading` renders its children inside an `<h3>`, and my first pass put an `HStack` (a `<div>`) there — invalid content model for a heading. Replaced with a scoped inline-level `.groupHeading` class.

## Verified by driving the app

Against the live server at 1600×950 (`pnpm dev` → `:8010`), with the console watched for page errors (none):

- **List:** the filter bar is out of `<header>` and above the table.
- **Detail header:** the field cluster renders label-above-control — `Customer name`, `Customer reference`, `Category` — in one row.
- **Detail filters:** one chip, `filter-input-itemCodeOrName`, plus the **Add filter** menu; no separate search box.
- **No remount on typing:** typing `para` into the always-on chip leaves focus on that same input with its value intact — moving the `FilterBar` under `DataTable`'s `children()`-resolved `filters` prop does not re-instantiate it.
- **Side panel:** two ruled `<h3>` subheadings; the comment is a `<textarea>`; the tax amount renders as helper text under its input.

**Density note (the D2 risk, measured).** The subheadings make the Invoice-details section taller, so it now meets the pinned Actions section sooner: at 1600×950 with every section expanded, the panel's content is 1410px against a 914px viewport, and Grand total sits below the fold at first paint. **Nothing is unreachable** — the `<aside>` scrolls, and after 496px of scroll Grand total, Foreign currency (Code/Rate/Total) and Transport details are all fully visible above the pinned cluster. This is denser than before the change, not broken by it; it is the first thing to judge in the visual pass, and it is the same tension the inbound attempt hit.

## Reactivity re-check

Run over the diff per the [`check-reactivity`](../../../.claude/skills/check-reactivity/SKILL.md) checklist: **no findings.** No props were destructured or spread; `OutboundToolbar` reads `props.*` throughout; `SidePanelSubheading` reads its `action` element once; the new `alwaysOn` filter's `render` reads `props.filter()` inside its own tracking scope. The moved `FilterBar` was the one real risk — `DataTable` resolves `filters` through `children()`, and both `detailFilters` (a plain const) and `filterFields()` (a module-level const) read nothing reactive at element-creation time, so the subtree resolves once. Confirmed live by the focus-survives-typing check above.

## Checked and deliberately left alone

- **The related-documents hover tooltip** ([OutboundSidePanel.tsx](detail/OutboundSidePanel.tsx)) keeps raw `Popover openOnHover`: `InfoTooltip` hard-codes an `InfoIcon` trigger, and here the trigger must be the **label text** because the entry's number is already a link. `Popover` is the primitive `InfoTooltip` wraps — not a hand-roll. → **LIB-2**.
- **`title` on the disabled Duplicate button** — this **is** the house pattern; inbound's F10 cites this exact line as its reference.
- **`<strong data-testid="selected-rows-count">`** — 12 sites across 10 verticals including the reference.
- ~~**The Log tab's single Date/time column**~~ — **corrected and fixed, see F16.** The first draft counted only two sibling logs and called the split content rather than composition; both were wrong. All six hand-rolled log surfaces AND the shared [`ActivityLogPanel`](../../domain/activityLog/ActivityLogPanel.tsx) split Date and Time, as does the current app — outbound was 1-of-7.
- `rowState` (not the retired `rowDimmed`), `ColourTagPicker variant="row"`/`"field"`, `createTableConfig` on all four tables, `ConfirmDialog` where the body is a plain message, and no colour or px literals anywhere.

## Library findings surfaced (not fixed here)

- **LIB-1 — `SIDE_PANEL.md`'s own recipes contain an inline `style`.** The group-heading and value+action recipes use `style={{display:'inline-flex',…}}`, which the reach-for order forbids and which is how the pattern spread into this vertical. Worth a doc fix, but it edits a binding contract, so it is flagged rather than done. Related: there is no inline-level stack primitive, which is why the heading needed a local class (below).
- **LIB-2 — `InfoTooltip` has no custom `trigger`.** Its trigger is a fixed `InfoIcon`, so a "gloss on a word" must drop to raw `Popover`.
- **LIB-3 — no inline-level `HStack`.** `HStack`/`Stack` are block-level `<div>`s, so a row inside a heading or other phrasing context needs a local class (`.groupHeading` here). An `as` prop, or an inline variant, would close it.
- **LIB-4 — `HStack` can't express a two-axis gap or per-child flex basis.** That is what keeps `.headerRow` a CSS module.
- **LIB-8 — the `code` kind's 7rem growth cap may be too tight for code columns generally.** It is a HARD cap, so any code column whose content reaches it becomes undraggable — outbound's Batch was pinned there (F17), its Item code has 18px left, and inbound's Batch is 32px away. Either the cap stays and each over-wide column overrides it locally, or `batch`/`itemCode` get `maxSize: null` in the shared config. A decision for the library owner, not a migration.
- **LIB-7 — two verticals' Log tabs crash on `main`.** `InboundShipmentLogPanel.tsx:134` and `supplier-returns/detail/LogTab.tsx:83` both pre-format their time accessor **and** apply `getCellDefinition('time')`, which double-formats and throws `Invalid time value` — an endless spinner instead of the log. One-line fix each (hand the cell the raw `datetime`); worth a guard so the preset can't be handed a formatted string. Found via F16.
- **LIB-6 — six verticals hand-roll a log surface** (outbound, inbound, stocktakes, internal orders, both returns) instead of consuming the shared `domain/activityLog/ActivityLogPanel` that items, patients, prescriptions and stock use — six near-identical queries and column sets. Surfaced by F16; a consolidation task, not a migration one.
- **LIB-5 — inherited, already filed by siblings:** the icon-tone class (inbound's LIB-3, used here by `.variantInfoTrigger`) and a native `title` on a disabled button not rendering in Chromium (inbound's LIB-5, which Duplicate relies on).

## Boutique / uncovered elements

- **`.headerRow` (the D76 wrapping header)** — **(c) a deliberate, documented exception**: two-axis gap + per-child flex bases (LIB-4).
- **`.batchGrid` height floor** — **(c) a deliberate exception**: a documented fix for the grid collapsing to 0 in a short landscape dialog.
- **`.groupHeading`** — **(a) a candidate library prop** (LIB-3): an inline-level stack.
- **`.totalLabel`** — **(c) a deliberate exception pending a design decision** (D1).
- **`.variantInfoTrigger` icon tone** — **(a) a candidate library prop**, already filed as inbound's LIB-3.
- **`.available` optical nudge** — **(c) a deliberate exception**, flagged.
- **The doses / volume / FC-price / log columns with no `_globalColumnConfig` key** — **(c)** call-site `size` values, as supplier-returns did for its unkeyed columns.

## Your visual pass — the part this migration can't sign off

Static checks and a scripted drive can't grade "compiles clean but looks wrong". Open each screen in **light and dark**:

| Screen                  | Route                                          | Compare against                                         |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| List                    | `/{store}/distribution/outbound-shipment`      | `#/showcase/table`, the stocktakes + inbound lists      |
| Detail (header + table) | `/{store}/distribution/outbound-shipment/{id}` | **`#/showcase/header`**, `StocktakeDetailView`          |
| Side panel              | the same screen, **More**                      | **`#/showcase/side-panel`**, `InboundShipmentSidePanel` |
| Line editor             | click a line, or **Add item**                  | `#/showcase/table` (card/table model)                   |
| Log tab                 | the Log tab                                    | the inbound log panel                                   |

What to look at first, in order of how likely it is to be wrong:

1. **The side panel's Invoice-details density** — the measured D2 consequence above. Does the group break earn its space, and is scrolling to Grand total acceptable?
2. **Column widths and drag-resizing** on all four tables — F5 changed every width. Watch the Unit vs Pack size headers (the pair supplier-returns found touching), the log's Date/time, and the line volume column.
3. **The detail header cluster** — the customer lookup, reference and custom fields now share equal-width slots; check the wrap at narrow widths and that nothing looks stranded.
4. **The always-on search chip** — it should shrink-wrap and read as a search box via its placeholder, with one clear affordance.
5. **Dialog button tone** — the confirms are now `primary` OK / `danger` Delete rather than uniform secondary; check the delete confirmations especially.
6. **The footer Close** — now labelled beside Confirm; check it doesn't crowd the status split button at narrow widths.
