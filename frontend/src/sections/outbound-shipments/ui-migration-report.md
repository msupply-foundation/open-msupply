# Outbound shipments — UI migration report

Audit of the **whole** `outbound-shipments` vertical against the eleven dimensions in [`MIGRATING_A_VERTICAL.md`](../../ui/docs/MIGRATING_A_VERTICAL.md). Judged against the rules, the [component registry](../../../spec/ui-standards/components.md), the binding [side-panel contract](../../ui/docs/SIDE_PANEL.md), the reference vertical (`src/sections/stocktakes/`), and the sibling verticals that fill the roles stocktakes lacks — inbound shipments, supplier/customer returns, internal orders, prescriptions, names, patients.

**Status: migrated and verified — `pnpm check` green, `pnpm test` green (1147 tests, 121 files). The operator's visual pass is outstanding.**

The three [spec edits](#spec-edits--signed-off-and-made) are signed off and made. The **side panel was brought into scope** on the operator's instruction (2026-07-30): the settled pattern is [`SIDE_PANEL.md`](../../ui/docs/SIDE_PANEL.md) itself, so its whole contract was applied — F8, F9, F10, F11 and F12 are all fixed, and [Decision 1](#decisions--resolved) is closed. Merged onto `main` before the PR, which superseded one finding ([F7](#f7--the-log-tab-was-a-bespoke-table-where-a-shared-surface-exists-dim-3-1-11)) with a better shared-component answer.

Eight siblings have already been migrated (`dashboard`, `inbound-shipments`, `items`, `locations`, `master-lists`, `names`, `stocktakes`, `supplier-returns`), so most of what follows is a straggler carrying findings its siblings have already fixed, with the fix shape settled. Two things make this vertical's audit distinctive:

- Its **side panel** is one of the two live references [`SIDE_PANEL.md`](../../ui/docs/SIDE_PANEL.md) names — and it breaks that contract's rules 1, 2 and 3. This is entangled with a decision you made yesterday on the sibling panel; see [Decision 1](#decisions-needed).
- Three of its `ui-surface.md` sentences describe presentation that the current standards have since overruled — [three spec edits](#spec-edits--sign-off-required) for your sign-off.

## Coverage table

Rows are the vertical's screens and composed pieces; each cell is `✅` or the finding count. Dimensions: 1 registry/C3 · 2 screen composition · 3 tables · 4 inputs · 5 detail/side panel · 6 styling · 7 reactivity · 8 types · 9 a11y · 10 test hooks · 11 spec consistency.

All findings are fixed, so the table below is the **end state**; the audit's original counts stay in brackets, so the scope of each row's change remains visible. Counts marked **†** were **missed by the first audit pass and raised by the operator** — F21 (D8 card model) and F22 (D1 side-panel open state); see both findings for why the check didn't fire.

| Screen / piece                      | 1       | 2      | 3       | 4      | 5      | 6      | 7       | 8      | 9      | 10     | 11      |
| ----------------------------------- | ------- | ------ | ------- | ------ | ------ | ------ | ------- | ------ | ------ | ------ | ------- |
| **L1** List screen                  | ✅ (1)  | ✅     | ✅ (2)  | ✅     | ✅     | ✅ (1) | ✅      | ✅     | ✅     | ✅     | ✅      |
| **L2** List filters                 | ✅      | ✅     | ✅      | ✅     | ✅     | ✅     | ✅      | ✅     | ✅     | ✅     | ✅      |
| **L3** Customer-selection modal     | ✅ (1)  | ✅     | —       | ✅     | ✅ (1) | ✅     | ✅      | ✅     | ✅     | ✅     | ✅      |
| **L4** List actions (×3)            | ✅ (2)  | ✅     | —       | ✅     | ✅ (2) | ✅     | ✅      | ✅     | ✅     | ✅     | ✅      |
| **D1** Detail view shell            | ✅ (3†) | ✅ (1) | ✅ (3)  | ✅     | ✅ (1) | ✅     | ✅ (1†) | ✅ (1) | ✅     | ✅ (1) | ✅ (3†) |
| **D2** Detail header field cluster  | ✅ (1)  | ✅ (1) | —       | ✅ (1) | ✅ (1) | ✅     | ✅      | ✅     | ✅     | ✅     | ✅ (1)  |
| **D3** Detail line filters          | ✅ (1)  | ✅     | ✅ (1)  | ✅     | ✅     | ✅     | ✅      | ✅     | ✅     | ✅ (1) | ✅ (1)  |
| **D4** Side panel                   | ✅ (2)  | ✅     | —       | ✅ (2) | ✅ (5) | ✅ (2) | ✅      | ✅     | ✅     | ✅     | ✅ (2)  |
| **D5** Picked-date field            | ✅ (1)  | ✅     | —       | ✅ (1) | ✅ (1) | ✅ (1) | ✅      | ✅     | ✅     | ✅     | ✅      |
| **D6** Status footer                | ✅ (1)  | ✅     | —       | ✅     | ✅ (1) | ✅     | ✅      | ✅     | ✅ (1) | ✅     | ✅ (1)  |
| **D7** Log tab                      | ✅ (1)  | ✅     | ✅ (2)  | ✅     | ✅     | ✅     | ✅      | ✅     | ✅     | ✅     | ✅ (1)  |
| **D8** Line-edit modal              | ✅ (4†) | ✅     | ✅ (3†) | ✅     | ✅     | ✅ (3) | ✅      | ✅ (1) | ✅     | ✅     | ✅      |
| **D9** Detail actions (×6)          | ✅ (3)  | ✅     | —       | ✅     | ✅ (3) | ✅     | ✅      | ✅     | ✅     | ✅     | ✅      |
| **D10** Service-charges editor (S5) | ✅      | ✅     | ✅      | ✅     | ✅     | ✅     | ✅      | ✅     | ✅     | ✅     | ✅      |

`—` = the dimension has no surface on that piece. Bracketed numbers are finding **occurrences**, so one finding (e.g. F4) counts on several rows. **D10** is the shared `domain/invoice` `ServiceChargesModal` — owned by the domain module, already conforming, and only wired here.

**No dimension was clean across the whole vertical.** The first pass claimed dimension 7 (reactivity) was, on the strength of the vertical's **resource** discipline — every `createResource` reads non-suspending and says why: `data.latest` with the no-remounts rationale at [OutboundDetailView.tsx](detail/OutboundDetailView.tsx), the serialised-source pattern on both paginated queries, the `.state`-gated read in the (since-deleted) bespoke Log tab, the `[...draft]` shape-tracking memo in [the line editor](detail/edit-modal/OutboundLineEditModal.tsx). That part holds. But auditing the resources is not auditing the dimension: the vertical also had a plain `createEffect` writing a derivable signal (**F22**), which is pitfall §7 and was the cause of a real user-visible defect. The claim was wrong, and the lesson is that a dimension is only clean once every item in its checklist has been run — not once its most prominent pattern has.

## Findings

### F1 — The detail header hand-rolls `<Toolbar>` + `FieldRow` instead of `HeaderToolbar` (dim 2, 1, 4, 5, 11)

[OutboundDetailView.tsx:806-880](detail/OutboundDetailView.tsx#L806) wraps the customer lookup and customer-reference field in inline `FieldRow label={…}` + `hideLabel` pairs inside a bare `<Toolbar>`.

**Rule:** registry [App bar — page content](../../../spec/ui-standards/components.md#screen-structure-regions): "a detail screen's header fields use `HeaderToolbar`, which fixes their layout (each field labelled above its control, equal shares wrapping as a unit) **so every detail header reads alike** — `Toolbar` stays for other content". Also [`PAGES.md`](../../ui/docs/PAGES.md) § header field cluster.

**Six verticals already agree** — every one of them extracts a `*Toolbar.tsx` whose children are label-above fields inside the view's `<HeaderToolbar>`: [`StocktakeDetailToolbar.tsx`](../stocktakes/detail/StocktakeDetailToolbar.tsx) (the reference), [`InboundShipmentDetailToolbar.tsx`](../inbound-shipments/detail/InboundShipmentDetailToolbar.tsx) (the closest sibling — same customer/reference/date shape), plus `customer-returns`, `supplier-returns`, `prescriptions`, `patients`. Outbound and `items` / `internal-orders` are the remaining hand-rolls.

**Fix:** extract `detail/OutboundDetailToolbar.tsx` matching the sibling file shape — `NameSearch label={t('label.customer-name')} size="small"` and `TextField label={t('label.customer-ref')} size="small" width="full"`, no `FieldRow`, no `hideLabel` — and render it as `<HeaderToolbar>`'s children in the view. `CustomFieldsToolbar` already composes for this host ([`domain/customFields/CustomFieldsToolbar.tsx`](../../domain/customFields/CustomFieldsToolbar.tsx) imports `HeaderToolbar`), so the promoted custom fields join the same row.

**Spec edit 1** follows (the `ui-surface.md` sentence naming a labelled field row).

### F2 — Detail line filters sit in the page header, and the item search is a `FilterTextInput` used outside a filter chip (dim 3, 1, 10, 11)

Two halves of one finding:

- [OutboundDetailView.tsx:864-874](detail/OutboundDetailView.tsx#L864) renders a bare `FilterTextInput` as an always-on search box in the page header, beside…
- …[OutboundDetailView.tsx:875-879](detail/OutboundDetailView.tsx#L875), the `FilterBar` — also in the page header. The detail `DataTable` ([:975](detail/OutboundDetailView.tsx#L975)) is handed no `filters` prop. [outboundDetailFilters.tsx:52](detail/outboundDetailFilters.tsx#L52) dismisses `itemCodeOrName: null` with the comment "rendered by the toolbar, not as a chip".

**Rules — two, both binding:**

1. [`tables.md` § Toolbar](../../../spec/ui-standards/tables.md): "The filter bar MUST render in this table toolbar — never in the page header / app bar, and never in a separate page-level toolbar band above the table. This binds every table, list or detail, and **overrides any vertical spec** that places filters elsewhere: a vertical states its filter _set_, never its _location_."
2. **`FilterTextInput` is being used outside its declared context** — a vertical bug, not a library gap. It reads `useChipFocus()` ([FilterBar.tsx:542](../../ui/elements/selectors/FilterBar.tsx#L542)), which returns `undefined` outside a chip, so the just-added-filter focus contract silently no-ops; its `.textFilter` / `.textFilterIcon` classes are named for the chip pill it isn't inside; and its `testId` prop documents that "FilterBar's render supplies `filter-input-<key>`" — the call site supplies none, so **the search has no test hook at all** (dim 10).

**The precedent is exact.** `Filter<F>.alwaysOn` exists for precisely this role and its doc names the case: "the one search a screen keeps to hand, e.g. **the stocktake detail's item code/name search** (#735)". The reference vertical implements it — [stocktakeDetailFilters.tsx:47](../stocktakes/detail/stocktakeDetailFilters.tsx#L47) marks the identical `itemCodeOrName` filter `alwaysOn: true`, [`StocktakeLineFilters.tsx`](../stocktakes/detail/StocktakeLineFilters.tsx) wraps the bar, and [StocktakeDetailView.tsx:950](../stocktakes/detail/StocktakeDetailView.tsx#L950) passes it to `DataTable filters=`. This was the reference vertical's own R10 migration finding.

**Fix:** in `outboundDetailFilters.tsx` give `itemCodeOrName` an `alwaysOn: true` definition rendering `FilterTextInput` with `props.testId` (copy the stocktakes definition, including its label/placeholder pair); add `detail/OutboundLineFilters.tsx` mirroring `StocktakeLineFilters`; pass it to the detail `DataTable`'s `filters` prop; delete the header search and the `FilterTextInput` / `FilterBar` imports from the view.

**Gains** the contract's `filter-input-itemCodeOrName` id ([`TESTIDS.md:82`](../../../e2e/TESTIDS.md)) — a dim-10 improvement, not just a move. **Spec edit 2** follows.

### F3 — The list's `FilterBar` is in the page header, not the table's toolbar (dim 3, 11)

[OutboundShipmentsList.tsx:317-328](list/OutboundShipmentsList.tsx#L317) wraps `FilterBar` (custom-field `extra` and all) in the `Header`'s `<Toolbar>`; the `DataTable` at [:369](list/OutboundShipmentsList.tsx#L369) gets no `filters`.

Same binding `tables.md` rule as F2. `DataTable` carries the slot for exactly this and says so at its `filters` prop ([DataTable.tsx:124](../../ui/elements/table/DataTable.tsx#L124)). Four migrated siblings fixed the identical finding — `stocktakes` (R10), `locations` (R1), `names` (R2), `items`, `supplier-returns`.

**Fix:** move the same `FilterBar` element to `DataTable filters=`; drop the `<Toolbar>` element and import. The header becomes `Breadcrumb` + `HeaderButtons`, like the reference. Filter state stays page-owned and URL-backed — only the placement moves.

Fixing F2 and F3 together is what makes the vertical internally consistent: list and detail must present their filters the same way.

### F4 — Dialog footers hand-roll Cancel/OK with icons (dim 5, 1) · 8 dialogs, 20 buttons

**Rule:** registry [Modal footer button](../../../spec/ui-standards/components.md#buttons--status) → `CancelButton` / `DialogSaveButton` / `SaveAndNextButton`, "**never** OK/OK & next, never an icon". [D55](../../../spec/DIVERGENCES.md) is binding and "applied app-wide (not stocktake-only)"; it keeps `OkButton` for a confirm that genuinely isn't a save, icon-less. Reference: the vertical's **own** line editor already does it right ([OutboundLineEditModal.tsx:1215-1250](detail/edit-modal/OutboundLineEditModal.tsx#L1215)); every migrated sibling converted the rest.

| Site                                                                                         | Now                                                  | Fix                                                                                                   |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [CustomerSearchModal.tsx:89](list/CustomerSearchModal.tsx#L89)                               | Cancel (× icon)                                      | `CancelButton`                                                                                        |
| [AddFromMasterListAction.tsx:108](detail/actions/AddFromMasterListAction.tsx#L108)           | Cancel (× icon) · **OK** (check)                     | `CancelButton` · `DialogSaveButton` — the spec names this button **Save** (ui-surface S3 Layout, D46) |
| [AllocateLinesAction.tsx:236,248,259](detail/actions/AllocateLinesAction.tsx#L236)           | OK (check) report · Cancel (× icon) · OK             | `OkButton` · `CancelButton` · `OkButton` (a confirm, not a save)                                      |
| [StatusChangeAction.tsx:263,270,290](detail/actions/StatusChangeAction.tsx#L263)             | Cancel (× icon) · OK (arrow) · OK (check)            | `CancelButton` · `OkButton` · `OkButton`                                                              |
| [DeleteShipmentAction.tsx:88,98,108](detail/actions/DeleteShipmentAction.tsx#L88)            | Cancel (× icon) ×2 · **OK** (check) to delete        | `CancelButton` ×2 · `Button variant="danger"` labelled `label.delete` (see F5)                        |
| [DeleteShipmentsAction.tsx:60,138,161,171](list/actions/DeleteShipmentsAction.tsx#L60)       | OK (check) · Cancel (× icon) ×2 · Delete (secondary) | `OkButton` · `CancelButton` ×2 · `Button variant="danger"` (see F5)                                   |
| [DuplicateShipmentAction.tsx:136,155,165,176](list/actions/DuplicateShipmentAction.tsx#L136) | OK (check) ×2 · Cancel (× icon) ×2                   | `OkButton` ×2 · `CancelButton` ×2                                                                     |
| [OutboundDetailView.tsx:726,1088](detail/OutboundDetailView.tsx#L726)                        | OK (check) on the not-found + return notices         | `OkButton` (keeping `data-testid="dialog-button-ok"`)                                                 |

Every testid is preserved — `StandardButtons` pass rest props straight through to `Button`.

### F5 — Destructive triggers and confirms aren't `danger` (dim 5)

Registry: semantic `variant`, delete = `danger`. Reference: [`supplier-returns/list/actions/DeleteReturnsAction.tsx:62,159`](../supplier-returns/list/actions/DeleteReturnsAction.tsx#L62) — trigger **and** confirm both `variant="danger"`; `customer-returns` matches.

- [DeleteShipmentAction.tsx:58](detail/actions/DeleteShipmentAction.tsx#L58) trigger + [:108](detail/actions/DeleteShipmentAction.tsx#L108) confirm — both `secondary`.
- [DeleteShipmentsAction.tsx:51](list/actions/DeleteShipmentsAction.tsx#L51) trigger + [:160](list/actions/DeleteShipmentsAction.tsx#L160) confirm — both `secondary`.
- [DeleteLinesAction.tsx:45](detail/actions/DeleteLinesAction.tsx#L45) trigger — `secondary`. (Its `ConfirmDialog` already passes `confirmVariant="danger"` ✅.)

### F6 — No column-width presets on any of the four tables (dim 3, 11) · ~35 columns

**Rule:** dimension 3 — "column widths via `getCellDefinition('<key>')`; **a bare helper sets no `size`, so the column mis-widths and can't be resized**". Every table in the vertical spreads bare `getNumberCell()` / `getDateCell()` / `getCurrencyCell()` / `getExpiryDateCell()` / `getCommentCell()`, or nothing at all. This was `inbound-shipments`' F6 across its 7 tables.

| Table                                                                             | Columns to convert to `getCellDefinition('<key>')`                                                                                                                                                                               |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **L1** list ([:205-291](list/OutboundShipmentsList.tsx#L205))                     | `otherPartyName`, `invoiceNumber`, `createdDatetime`, `theirReference`, `comment`, `totalAfterTax`                                                                                                                               |
| **D1** detail line table ([:542-705](detail/OutboundDetailView.tsx#L542))         | `itemCode`, `itemName`, `batch`, `expiryDate`, `vvmStatus`, `locationCode`, `unitName`, `packSize`, `dosesPerUnit`, `numberOfPacks`, `receivedNumberOfPacks`, `difference`, `unitQuantity`, `doses`, `sellPricePerPack`, `total` |
| **D7** log ([:54-70](detail/LogTab.tsx#L54))                                      | `datetime`, `user` (+ the Date/Time split — F7)                                                                                                                                                                                  |
| **D8** batch grid ([:829-1198](detail/edit-modal/OutboundLineEditModal.tsx#L829)) | `batch`, `expiryDate`, `packSize`, `dosesPerUnit`, `sellPricePerPack`, `numberOfPacks`, `receivedNumberOfPacks`                                                                                                                  |

Two riders:

- **Dim 11 lands here too.** `ui-surface.md` S3 specifies line-table columns 1 (Code) and 3 (Batch) as "text (**mono**)". Only `getCellDefinition('itemCode')` / `('batch')` deliver that — both resolve to kind `code`, which sets `mono: true`. The spec is right and the implementation is wrong: **no spec edit, fix the code.**
- **Columns with no `CELL_DEF` key** keep their explicit helper plus a rem-authored size. The sibling's answer is `size: remToPx(8)` with a comment naming the binding constraint ([InboundShipmentDetailView.tsx:52](../inbound-shipments/detail/InboundShipmentDetailView.tsx)); apply the same to the batch grid's raw px literals (`size: 36` [:845](detail/edit-modal/OutboundLineEditModal.tsx#L845), `170` [:913](detail/edit-modal/OutboundLineEditModal.tsx#L913), `200` [:936](detail/edit-modal/OutboundLineEditModal.tsx#L936)) and to `unitsIssued` / `volume` / `campaign` / `location` / `donor` / `manufacturer` / `onHold` / `canAllocate`. `columnSizing: { itemName: 18.75 }` in [the detail's table config](detail/OutboundDetailView.tsx#L355) becomes redundant once `getCellDefinition('itemName')` supplies the same 18.75rem — drop it.

### F7 — The Log tab was a bespoke table where a shared surface exists (dim 3, 1, 11)

**Superseded by `main` mid-migration, and the better answer won.** The fix below (splitting outbound's own hand-rolled table into the house Date + Time pair) was correct when written, but merging `origin/main` brought in [`domain/activityLog/ActivityLogPanel`](../../domain/activityLog/ActivityLogPanel.tsx) — a shared record-Log surface whose doc says "consumed by any record's detail", with six consumers already. [`d0bd91a8`](https://github.com/msupply-foundation/open-msupply-frontend/commit/d0bd91a8) had just folded the requisition and internal-order tabs onto it, deleting both bespoke tabs and their duplicate queries.

So outbound's `LogTab.tsx` is **deleted** and the tab renders `<ActivityLogPanel storeId recordId order="oldest-first" />`. That is strictly better than my fix:

- The panel renders Date · Time · User · Event · **Details** — a superset; outbound never had Details.
- Its event labels resolve through `log.<kebab>` locale keys. Outbound's hand-rolled `type.toLowerCase().replaceAll('_', ' ')` produced **unlocalised English** in every locale — a defect my audit didn't even flag.
- `order="oldest-first"` preserves the tab's existing order and matches the real OMS `ActivityLogList` (no sort sent → server datetime-ascending).

The duplicate `outboundActivityLogs` query is gone from both `outboundDetail.graphql` and its `.generated.ts` (a pure removal, hand-reconciled — codegen introspects a live backend), mirroring what the sibling commit did.

The original finding, for the record:

#### F7 (as originally fixed) — not the house Date + Time log table (dim 3, 1)

[LogTab.tsx:54-70](detail/LogTab.tsx#L54) renders one "Date-time" column with a hand-written `localisedDateTime` cell; `user` and `event` are bare columns.

**Rule:** [`CELL_TYPES.md`](../../ui/docs/CELL_TYPES.md) / `getTimeCell`'s own doc: "The Date + Time pair is **the house shape for any log / ledger / history table (activity logs**, the stock ledger, repack + VVM history), which is why this is a preset rather than a `cell` hand-written per table."

**Seven sibling tables already do it** — `customer-returns/detail/LogTab.tsx:92`, `supplier-returns/detail/LogTab.tsx:85`, `inbound-shipments/detail/log/InboundShipmentLogPanel.tsx:136`, `items/detail/ItemLedgerPanel.tsx:329`, `stock/detail/LedgerPanel.tsx:91`, `stock/detail/VvmHistoryPanel.tsx:50`, `stock/detail/RepackModal.tsx:220`. Outbound is the only log table left hand-rolling it.

**Fix (now superseded — see above):** split into `getCellDefinition('datetime')` + `getCellDefinition('time')` over the same instant, and `getCellDefinition('user')`. The shared panel does the same split and more, so the vertical no longer owns any of this code.

### F8 — Side panel: group headings are `FieldRow`s with a fake bold label (dim 5, 1, 6, 11)

**Binding — [`SIDE_PANEL.md`](../../ui/docs/SIDE_PANEL.md) rule 1:** "Group headings use `SidePanelSubheading` — **never** a `FieldRow` with a bold label."

[OutboundSidePanel.tsx:118-130](detail/OutboundSidePanel.tsx#L118) defines a `groupHeading` helper — an inline `style` block doing `display: inline-flex` + `font-weight` — and passes its output as a `FieldRow`'s `label` at three sites:

- [:283-288](detail/OutboundSidePanel.tsx#L283) Service charges (its edit `IconButton` becomes the row's _value_)
- [:334-341](detail/OutboundSidePanel.tsx#L334) Items sell price — with `<span />` as a filler value, the clearest tell that this isn't a field row
- [:394-404](detail/OutboundSidePanel.tsx#L394) Foreign currency — a heading-as-`FieldRow` whose only child is its edit button

`ui-surface.md` L152/155 calls all three "**group heading**", so spec and contract agree.

**Fix:** `SidePanelSubheading` with `action={<IconButton bordered size="small" …/>}`, using the contract's info-tooltip-**after**-the-text recipe (the current code puts the tooltip before the label); delete `groupHeading` and the inline `style`.

### F9 — Side panel: the tax amount is floated right instead of being the input's `helperText` (dim 5)

**Binding — `SIDE_PANEL.md` rule 3:** "A calculated figure that belongs to an input is its `helperText` (sits below the input), **never a value floated to the right of the row** — that breaks the value-alignment column."

[OutboundSidePanel.tsx:346-370](detail/OutboundSidePanel.tsx#L346) puts the tax `NumberField` and the computed amount side by side in an `HStack`. The contract's own recipe ("Percentage input with its calculated amount") is the fix, verbatim: `helperText={money(taxAmount(…))}`, plus `width="compact"` (rule 2 — a percentage is a short value) — and `ui-surface.md` L153's "shown with the tax amount" is satisfied either way.

### F10 — Side panel: the comment is a single-line `TextField` (dim 5, 4, 11)

[OutboundSidePanel.tsx:205-215](detail/OutboundSidePanel.tsx#L205).

Two independent authorities say the same thing: `SIDE_PANEL.md` rule 2 ("Multi-line text (a comment) is a `TextArea`") and `ui-surface.md` L149 ("comment (**multi-line**)"). The contract even ships the recipe. **Fix:** `TextArea width="full"`, keeping `data-testid="comment-field"`.

### F11 — Side panel: single-line inputs miss `size="small"` / the right `width` (dim 5, 4)

**`SIDE_PANEL.md` rule 2:** every single-line input is `size="small"`; `width="compact"` for a short value (%, date, code), `width="full"` for free text. "Never leave a single-line input at default height."

| Site                                                                      | Now                          | Fix                            |
| ------------------------------------------------------------------------- | ---------------------------- | ------------------------------ |
| [:448 `DateField`](detail/OutboundSidePanel.tsx#L448) expected delivery   | no `size`, no `width`        | `size="small" width="compact"` |
| [:465 `TextField`](detail/OutboundSidePanel.tsx#L465) transport reference | `width="full"` ✅, no `size` | add `size="small"`             |
| [:432 `ShippingMethodSelect`](detail/OutboundSidePanel.tsx#L432)          | no `size`                    | `size="small"`                 |

### F12 — Side panel: grand-total emphasis is an inline `style` (dim 6, 5)

[OutboundSidePanel.tsx:376-385](detail/OutboundSidePanel.tsx#L376) — `<span style={{ 'font-weight': 'var(--weight-bold)' }}>`. An inline `style` is always a finding (reach-for order step 5).

**Fix:** `<Text variant="subtitle" as="span">` — the registry's type primitive, semibold, no new CSS. Note this drops the weight 700 → 600; the _cross-panel_ treatment of a totals row is `SIDE_PANEL.md`'s own recorded open item and is **not** outbound's to settle alone — logged as **LIB-1**.

### F13 — `PickedDateField` builds its row from two inline `style` blocks (dim 1, 6, 5, 4)

[PickedDateField.tsx:157-163](detail/PickedDateField.tsx#L157) is an inline-flex row; [:169](detail/PickedDateField.tsx#L169) is a `display: grid; width: 8rem` wrapper whose comment explains it exists to stop the field filling the panel's control column.

**Fix, climbing the ladder rather than moving the CSS:** `HStack gap="sm"` for the row, and **delete the sizing wrapper entirely** — `size="small" width="compact"` on the `DateField` is the contract's own answer for a date (rule 2), and `compact` is the narrowest cap. That removes the bespoke 8rem literal and satisfies F11's rule at the same time.

### F14 — The status footer's Close is a hand-rolled icon-only `IconButton` (dim 1, 5, 9, 11)

[OutboundStatusFooter.tsx:111-116](detail/OutboundStatusFooter.tsx#L111), whose comment reads "the same close the inbound status footer renders" — inbound has since been migrated.

**Rule:** registry [Action-footer close](../../../spec/ui-standards/components.md#buttons--status) → `CloseButton`, "secondary, close glyph, and **labelled**: a footer action is read as a verb, so a hand-rolled icon-only close is a bespoke look-alike". [`StandardButtons.tsx:40-49`](../../ui/elements/buttons/StandardButtons.tsx#L40) records the decision and the count: "two verticals had hand-rolled one; three had the labelled form, which won" — outbound is one of the two. Reference: [`SupplierReturnStatusFooter.tsx:71`](../supplier-returns/detail/SupplierReturnStatusFooter.tsx#L71).

**Fix:** `<CloseButton data-testid="close-button" onClick={props.onClose} />`. The `close-button` id the deterministic suite drives ([distribution-regression.spec.ts:953](../../../e2e/specs/distribution-regression.spec.ts#L953)) is preserved, and `CloseButton` collapses to icon-only on phones by default — so the dense case stays a width outcome rather than a per-vertical choice. **Spec edit 3** follows.

### F15 — Line-editor grid footer and warning stack are inline-`style` flex (dim 1, 6)

- [OutboundLineEditModal.tsx:1373-1388](detail/edit-modal/OutboundLineEditModal.tsx#L1373) — `display: flex; justify-content: end; gap: var(--space-4); margin-block-start: var(--space-2)`
- [:1392-1403](detail/edit-modal/OutboundLineEditModal.tsx#L1392) — `display: flex; flex-direction: column; gap: var(--space-2); margin-block-start: var(--space-2)`

**Fix:** `HStack gap="md" justify="end"` (md = `--space-4`) and `Stack gap="sm"` (sm = `--space-2`) — the gap presets match the current literals exactly. Wrap the footer + banner region in one `Stack gap="sm"` so its gap replaces both `margin-block-start`s, leaving no CSS behind. Registry: "A hand-rolled flex row here is a bespoke look-alike (C3)."

### F16 — The list's name cell builds its row with an inline `style` (dim 1, 6)

[OutboundShipmentsList.tsx:216-234](list/OutboundShipmentsList.tsx#L216) — an `inline-flex` span around the colour swatch + customer name.

**Fix:** `HStack gap="sm"` (`--space-2`, the current gap). This is the _first row_ of `inbound-shipments`' F1 table, fixed there the same way. Its note applies: the same wrapper exists in five sibling lists and in `domain/name/NameSearch.tsx` — that cross-vertical sweep is logged as inbound's **LIB-3** and stays out of scope; outbound's own instance is fixed here.

### F17 — Hand-rolled `<table>` in the line editor's variant-info popover (dim 1, 3)

[OutboundLineEditModal.tsx:103-152](detail/edit-modal/OutboundLineEditModal.tsx#L103) (`VariantInfoTable`) builds a raw `<table class={styles.variantTable}>` with its own `th`/`td` padding, hairline and marker-column CSS.

**Rule:** registry [Static sub-table](../../../spec/ui-standards/components.md#tables) → `Table` ✅ — "the display shell only … For a **short, fixed** row set presented _inside_ another surface — a detail card's sub-table, **a dialog's read-only block** — where the data table's toolbar chrome would outweigh the content." That is exactly this: a fixed list of an item's variants in a popover, no sorting/filtering/pagination/selection.

**Fix:** `<Table label={t('label.item-variant')}>` with the screen composing `<thead>`/`<tbody>`; the marker column becomes `<td data-check>` (the shell's own narrow centred-marker convention) and the CSS module loses `.variantTable`, `.variantTable th`, `.variantTable td` and `.variantMarker` — `.variantPanel`'s `max-width` stays. Reference consumer: [`items/detail/ItemVariantCard.tsx`](../items/detail/ItemVariantCard.tsx).

### F18 — A literal font-weight in the line-editor CSS module (dim 6)

[OutboundLineEditModal.module.css:91](detail/edit-modal/OutboundLineEditModal.module.css#L91) — `font-weight: 600` should be `var(--weight-semibold)`. Every value a token, never a literal. (Disappears with F17, which deletes the rule; listed so it isn't lost if F17 lands differently.)

Grepped clean otherwise: no colour literals (`#`/`rgb`/`hsl`) anywhere in the vertical, no px on spacing or sizing, logical properties throughout.

### F19 — `as Column<…>` casts on conditionally-included columns (dim 8)

`kdd/type-safety`: `as` only in trusted layers. Nine sites — [OutboundDetailView.tsx:593,622,667](detail/OutboundDetailView.tsx#L593) and [OutboundLineEditModal.tsx:927,951,994,1011,1147,1167](detail/edit-modal/OutboundLineEditModal.tsx#L927) — cast a preference-gated column literal so it spreads into the array.

**The three sibling detail views carry zero such casts**: `stocktakes`, `inbound-shipments` and `internal-orders` all write `satisfies Column<Line, SortKey>` on the same construct, which type-_checks_ the literal instead of asserting over it. **Fix:** `as` → `satisfies` at all nine sites.

### F20 — Test hooks (dim 10)

One real gap, fixed by F2: the detail's item search carries **no** `data-testid`, where the contract names `filter-input-itemCodeOrName` ([`TESTIDS.md:82`](../../../e2e/TESTIDS.md)). Everything else checks out — no hand-stamped duplicate of an id a host component generates, and the shared ids (`selected-rows-count`, `close-button`, `detail-panel`, `panel-section-<value>`, `comment-field`, `issue-quantity-input`, `return-lines-button`, the `header-`/`cell-` column ids) all arrive correctly.

One id worth adding while nearby (not a contract violation, since `TESTIDS.md` doesn't name it for outbound): the Add-from-master-list `Dialog` ([AddFromMasterListAction.tsx:105](detail/actions/AddFromMasterListAction.tsx#L105)) has no `testId`, where inbound's equivalent modal is `add-master-list-modal`. Flagging rather than doing — extending the testid contract is `TESTIDS.md`'s call.

### F21 — The line editor's batch grid was table view, not the card model (dim 3, 1)

**Missed by the first audit pass; raised by the operator.** [OutboundLineEditModal.tsx](detail/edit-modal/OutboundLineEditModal.tsx) rendered its batch grid as a plain table: no `cardGroups`, no `viewMode: 'card'` default, and no `headerPosition` on the batch identity.

**Rule:** dimension 3 names "the card model (`cardGroups`/`headerPosition`)" explicitly, and [`CARD_TABLE_MODEL.md`](../../ui/docs/CARD_TABLE_MODEL.md) is its reference.

**The house pattern, decisively:** both sibling **batch-grid** editors do the same thing, with the _identical_ group taxonomy — [`InboundShipmentLineEditModal.tsx:254`](../inbound-shipments/detail/edit-modal/InboundShipmentLineEditModal.tsx#L254) and [`StocktakeLineEditModal.tsx`](../stocktakes/detail/edit-modal/StocktakeLineEditModal.tsx): `defaultConfig: { base: { viewMode: 'card' } }` + a `batch` / `pricing` / `other` `CardGroup[]` with matching `labelKey`s and icons (`StockIcon` / `InfoIcon` / `MessageSquareIcon`), batch as the card's `headerPosition: 'primary'` identity, and the two secondary groups as closed disclosures.

**Fix:** mirrored that exactly — same three group keys, labels and icons, so one card vocabulary reads the same across every line editor. Column placement:

| Group                    | Columns                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| _card header_            | **Batch** — the captioned `primary` identity, read-only · the auto-allocate tick and **On hold** flag as `badge` markers |
| **batch** (always shown) | Expiry · VVM status · Location · Pack size · Doses per unit · In store · Available · **Packs issued** · {unit} issued    |
| **pricing** (closed)     | Pack sell price · FC sell price                                                                                          |
| **other** (closed)       | Campaign/program · Donor · Manufacturer · Packs received · Difference · Volume                                           |

The issue quantity and the stock context it's judged against stay in the always-shown panel — the editor's whole purpose — with provenance and receipt reconciliation behind disclosures.

**Why the audit missed it.** My dimension-3 detector listed "`cardGroups`/`headerPosition` for the card model?" and I ran it against the **list** tables only, where outbound was already correct (`viewMode: 'card'` in its compact band). I never ran it for **D8**. A single `grep -rln cardGroups src/sections/` would have surfaced the gap immediately — the check was in the plan and simply wasn't executed on every row, which is exactly what the coverage table exists to prevent.

**The first fix shipped a broken card header** (operator, second review: "there's nothing in the header"). I had declared the identity as a sibling key:

```tsx
meta: { headerPosition: 'primary' },
...getCellDefinition('batch'),        // returns its own `meta` — overwrites the line above
```

`getCellDefinition` returns a fragment **containing `meta`**, so spreading it after a literal `meta:` silently discards it: the column lost `headerPosition`, the card had no primary identity, and the header rendered empty. The correct form passes the meta as the helper's **second argument**, which merges caller-wins — the mechanism [F6](#f6--no-column-width-presets-on-any-of-the-four-tables-dim-3-11) already relies on for `headerPosition`/`wrapLines` elsewhere in this very migration. Compounding it: after the bulk edit I verified spread-vs-`cell` ordering across all four tables and never checked spread-vs-`meta`, the other half of the same hazard. A scripted sweep now checks both, and found this to be the only instance.

The header also gained the two flags inbound's identity column carries and mine lacked — `showLabel: true` (a header field is unlabelled by default, so the caption "Batch" has to be opted into) and `hideFromColumnSettings: true` (the card identity is structural, not user-configurable). Outbound's cell stays **read-only** — inbound types its batch code into a `TextField`, but an outbound line issues from an existing stock batch, so the code is the batch's, not the user's.

### F22 — The side panel's open state was a hand-rolled effect, not the shared helper (dim 1, 7, 11)

**Missed by the first audit pass; raised by the operator**, who observed the panel opening on first load without being asked.

The code was:

```tsx
const isWide = createMediaQuery('(min-width: 1536px)');
const [sidePanelOpen, setSidePanelOpen] = createSignal(false);
createEffect(() => setSidePanelOpen(isWide()));
```

Three defects in three lines:

1. **Registry non-compliance (dim 1).** The registry's [side/detail panel](../../../spec/ui-standards/components.md#screen-structure-regions) row names the mechanism outright: "open state is the shared `createSidePanelOpen` (responsive ≥1536px default + persisted user choice)". **Five** sibling detail views use it — stocktakes (the reference), inbound, customer-returns, internal-orders, prescriptions. Outbound was the only hand-roll.
2. **§7 — an effect writing a derivable signal (dim 7).** `createSidePanelOpen` computes `open = () => choice() ?? wide()` — a _derivation_, where the responsive default applies only until the user chooses. As an **effect**, outbound's version re-fired on every media-query re-evaluation and force-reopened the panel, clobbering an explicit close.
3. **Spec drift (dim 11).** Spec S3 § side panel requires "the open/closed choice **persisted across reloads**". The hand-rolled version read no storage, so a deliberate close never survived a reload. It also hard-coded the `1536px` literal instead of the shared `mediaQuery.sidePanelWide`.

**Fix:** `const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();` — behaviour, persistence and the breakpoint token all come from the shared helper.

**Why the audit missed it.** This is the more serious miss, because I asserted dimension 7 was **clean across the whole vertical** — and named the reactivity patterns I _had_ checked (the `.latest` reads, the serialised sources, the `[...draft]` memo) as evidence. I audited the resource reads and never swept the plain `createEffect`s, of which this vertical has two: the offset-clamp effect (a legitimate side effect) and this one. "Effect writing a derivable signal" is item 7 of the twelve-pitfall checklist; I didn't run it. A `grep -n createEffect` per file, judged against §7, is the check.

### Candidates judged BENIGN (no change)

- **`<strong data-testid="selected-rows-count">`** in both footers — the house pattern in **12** files including the reference vertical. Not a hand-roll.
- **`rowTone`** on the detail table — a current `DataTable` API (`DataTable.tsx:175`) used by four verticals including the reference. The retired member is `rowDimmed`, which appears nowhere here.
- **`.batchCell`** ([module.css:62](detail/edit-modal/OutboundLineEditModal.module.css#L62)) — an `inline-flex` cell row at `--space-1`. `HStack`'s tightest preset is `sm` (`--space-2`) and it's block-level, so nothing higher on the ladder covers it; a scoped CSS module is step 4 and legitimate. Logged as **LIB-2**.
- **Config-driven `Column[]` arrays** — the one sanctioned break from explicit composition.
- **The line editor's header-row CSS module** — see [Boutique](#boutique--uncovered-elements); it implements a ⛔ registry role.

## Spec edits — signed off and made

All three are **pure-UI** conflicts, so [dimension 11's tie-breaker](../../ui/docs/MIGRATING_A_VERTICAL.md#spec-consistency--the-durability-check) applies: the current standards + registry win and the spec moves. Each edit names a **role**, never a component (per [`spec/AUTHORING.md`](../../../spec/AUTHORING.md)). None changes behaviour, content or gating.

| #      | `spec/outbound-shipments/ui-surface.md`                                                                                                          | Why the standards win                                                                                                                                                                                                                                      | Edit                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** | [L163](../../../spec/outbound-shipments/ui-surface.md) — "Page content … **as inline `label: control` pairs on one row** ([labelled field row])" | The registry's App-bar-page-content row is explicit that a detail screen's header fields use the **field-cluster** role, "which fixes their layout (each field labelled above its control) **so every detail header reads alike**". Six verticals conform. | Name the header **field cluster** role and drop the inline-pairs prescription: each field labelled above its control, wrapping as a unit. |
| **S2** | [L86](../../../spec/outbound-shipments/ui-surface.md) — "**Item search** (always-on **toolbar** search)"                                         | [`tables.md` § Toolbar](../../../spec/ui-standards/tables.md) is binding and **explicitly overriding**: "overrides any vertical spec that places filters elsewhere — a vertical states its filter _set_, never its _location_."                            | "**Item search** (an always-on filter, permanently present and not removable)" — set only, location deferred to `tables.md`.              |
| **S3** | [L179](../../../spec/outbound-shipments/ui-surface.md) — "**Close** ([**icon-only button**])"                                                    | The registry's Action-footer-close row requires the **labelled** form and names the icon-only version a bespoke look-alike; the decision is recorded in `StandardButtons` (Carl, 2026-07-30) and post-dates this sentence.                                 | Name the **action-footer close** role (which collapses to icon-only at phone widths of its own accord).                                   |

No [`DIVERGENCES.md`](../../../spec/DIVERGENCES.md) entry is needed for any of the three: none is a deliberate departure from the reference app's _behaviour_ — each is this repo's own composition standard, already recorded in `ui-standards`.

## Cross-vertical stragglers the F21/F22 sweep turned up

Both fixes prompted a proper cross-vertical grep. Outbound is fixed; these are other verticals' and stay out of scope, recorded so they aren't lost:

- **`PrescriptionLineEditModal` is a `draftStockOutLines` batch grid still on table view.** It runs the same query as outbound's editor ([PrescriptionLineEditModal.tsx:212](../prescriptions/detail/edit-modal/PrescriptionLineEditModal.tsx#L212)) but has no `cardGroups` and folds its batch grid behind a "Batches" disclosure instead — a genuinely different presentation, so this is an observation for the owner to rule on, not an assertion that it's wrong. Of the seven line-edit modals, 3 are batch grids (inbound, stocktakes, outbound — all now card) and prescriptions is the fourth.
- **Detail line tables have no house pattern for `cardGroups`** — only 2 of 7 carry it (stocktakes, customer-returns), and the two most recently migrated verticals (inbound, supplier-returns) deliberately don't. So outbound's detail line table was **not** treated as a finding; there is no majority to conform to. Worth a deliberate decision at some point, since a wide server-paginated line table's card view is currently whatever each vertical chose.

## Out of scope — a spec/impl behaviour gap (not migration work)

`ui-surface.md` L152 describes the side panel's **service** Tax row as having an edit affordance ("with **its edit** disabled when the service subtotal is zero"), but [OutboundSidePanel.tsx:309-325](detail/OutboundSidePanel.tsx#L309) renders it read-only — the code's comment says "Service tax is edited per line in S5". That is a behaviour/content question (spec-owned, so the spec would win), **not** UI composition, and migration changes composition only. Flagged for whoever owns the behaviour pass.

## Decisions — resolved

1. **Side panel (D4) in scope. ✅ Closed** (operator, 2026-07-30): the pattern is settled, and the settled pattern is [`SIDE_PANEL.md`](../../ui/docs/SIDE_PANEL.md) itself. The whole contract was applied — **F8, F9, F10, F11 and F12 all fixed** — so the panel now satisfies the doc's sign-off checklist instead of being a live reference that breaks it. The one thing left open is the _cross-panel_ totals-row treatment, which is the doc's own recorded open item and not outbound's to settle alone ([LIB-1](#library-findings-surfaced)).

## What was done

One commit-sized change per screen, in the order below; `pnpm check` and `pnpm test` were run at the end and are green. Net **−115 lines** over 19 edited files, plus 2 new ones.

| Screen                         | Change                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **L1** list                    | `FilterBar` (custom-field `extra` included) moved from the header `<Toolbar>` into `DataTable`'s `filters` slot — the header is now `Breadcrumb` + `HeaderButtons`, like the reference; 6 columns onto `getCellDefinition`; Status width via `remToPx`; the name cell's inline-flex span → `HStack gap="sm"`                                                       |
| **L3/L4** modal + list actions | `CancelButton` / `OkButton` throughout; the bulk-delete trigger and confirm → `variant="danger"` with the confirm labelled _Delete_                                                                                                                                                                                                                                |
| **D3** line filters            | `itemCodeOrName` became an `alwaysOn` chip carrying `props.testId`; new `OutboundLineFilters.tsx` wraps the bar (mirrors `StocktakeLineFilters`)                                                                                                                                                                                                                   |
| **D2** header                  | New `OutboundDetailToolbar.tsx` — `HeaderToolbar` children, labels **above** small controls, no `FieldRow`/`hideLabel`; `CustomFieldsToolbar` gets `layout="field"` so the promoted fields wear the same shape                                                                                                                                                     |
| **D1** detail shell            | The header `<Toolbar>` block replaced by `<HeaderToolbar>` + the new toolbar; line filters into `DataTable filters=`; 16 columns onto `getCellDefinition` (Code and Batch now render **mono**, per the spec); the redundant `columnSizing` override dropped; 3 `as` → `satisfies`; two notice dialogs → `OkButton`                                                 |
| **D4** side panel              | `groupHeading` rebuilt on `SidePanelSubheading` (tooltip now _after_ the text) and used for all three groups, incl. Foreign currency with the currency edit as its `action`; tax amount → the input's `helperText` + `width="compact"`; comment → `TextArea`; `size="small"` on the remaining single-line inputs; grand-total emphasis → `Text variant="subtitle"` |
| **D5** picked date             | Both inline-`style` wrappers gone: `HStack gap="sm"` for the row, and the bespoke 8rem grid box replaced by `size="small" width="compact"` on the `DateField`                                                                                                                                                                                                      |
| **D6** status footer           | Hand-rolled icon-only close → `CloseButton` (keeps `close-button`, sheds its label on phones by itself)                                                                                                                                                                                                                                                            |
| **D7** log tab                 | One "Date-time" column split into the house **Date + Time** pair over the same instant; `user` and `event` onto presets                                                                                                                                                                                                                                            |
| **D8** line editor             | `VariantInfoTable`'s raw `<table>` → the `Table` shell with `data-check` / `data-muted` (4 CSS rules deleted, incl. the literal `font-weight: 600`); grid footer → `HStack justify="end"` and the banners into one `Stack gap="sm"` replacing both margins; 7 columns onto presets; raw px sizes → `remToPx`; 6 `as` → `satisfies`                                 |
| **D9** detail actions          | `CancelButton` / `OkButton` / `DialogSaveButton` across all six; delete trigger + confirm → `danger`                                                                                                                                                                                                                                                               |

**Two follow-up fixes after the operator's review** (F21, F22): the line editor's batch grid onto the **card model** — `viewMode: 'card'` default plus the siblings' `batch`/`pricing`/`other` `CardGroup[]`, Batch as the card's primary identity, the auto-allocate tick and On-hold flag as header badges — and the detail view's side-panel state onto the shared **`createSidePanelOpen()`**, replacing a hand-rolled `createEffect` that ignored the persisted choice and reopened the panel on every breakpoint re-evaluation.

**Rebased onto `main` (38 commits) before the PR**, which changed two things:

- `DeleteShipmentsAction` — main removed the dialog's `success` phase (a clean delete now closes; D21/D22). One conflict, in exactly that region. Main's **behaviour** wins and my **composition** change (`CancelButton` / `danger` confirm) applies on top of its new shape — migration changes composition, never behaviour.
- The Log tab — folded onto the new shared `ActivityLogPanel`, superseding this migration's own F7 fix. See [F7](#f7--the-log-tab-was-a-bespoke-table-where-a-shared-surface-exists-dim-3-1-11).

**One file outside `src/sections/`:** `ShippingMethodSelect` (a domain module) gained a `size` passthrough to its `Combobox`. Rule 2 requires `size="small"` on every single-line side-panel input, and the sibling `VvmStatusSelect` already forwards exactly this prop — so this was a missing passthrough on one of three domain selectors, not a shared-library change. Called out here because it touches a file another vertical could consume.

### Reactivity

Re-reviewed the finished diff against [`kdd/solid-reactivity-pitfalls`](../../../kdd/solid-reactivity-pitfalls/draft-kdd.md): **clean.** The fixes introduced no `createEffect`/`createMemo`, no `.map()` renders, no destructured or spread props, and no new resource reads. Two checks worth recording because the diff moved JSX-element props around:

- `DataTable` resolves `props.filters` via `children(() => props.filters)` ([DataTable.tsx:300](../../ui/elements/table/DataTable.tsx#L300)) before reading it twice under a `<Show>` — the sanctioned form, so relocating both filter bars into that slot can't remount them.
- `SidePanelSubheading` reads its `action` prop exactly once, and the `IconButton`s passed in keep `disabled={props.disabled}` as a live getter — the edit affordances still dim reactively.

The pre-existing `locationsData.latest ?? []` read is unchanged and matches the reference vertical's identical shape ([StocktakeDetailView.tsx:319](../stocktakes/detail/StocktakeDetailView.tsx#L319)); it first-fetches on screen mount, so it sits inside the screen's own first-load boundary.

**This review is what should have caught F22 and didn't.** It scanned the _diff_ — where no new effect appeared — and treated the vertical's pre-existing effects as already-audited, because the audit had claimed dimension 7 clean. Two passes agreeing doesn't make either one thorough when both skipped the same check. The `createEffect` sweep has since been run over the whole vertical: two effects, the offset-clamp one at [OutboundDetailView.tsx](detail/OutboundDetailView.tsx) (a genuine side effect — it writes URL state from a resolved page, not a derivable value) and F22's, now gone.

## Boutique / uncovered elements

- **The line editor's one-wrapping-row header** — `.headerRow` / `.itemField` / `.available` / `.issueGroup` / `.placeholderNotice` in [the CSS module](detail/edit-modal/OutboundLineEditModal.module.css). This is a **⛔ registry role awaiting a build**, not a hand-roll to fix: the registry's [Modal content columns](../../../spec/ui-standards/components.md#screen-structure-regions) row records `Columns` as "**not built** — `src/ui/layout/Columns/` is an empty directory; consumers meanwhile use a plain wrapping flex row matching this behaviour", which is precisely what this module is, and [D76](../../../spec/DIVERGENCES.md) specifies the behaviour. Sanctioned interim; leave it.
- **`.batchGrid`'s min-block-size floor** — a genuinely bespoke fix for the landscape-with-soft-keyboard collapse, explained at length in the module. A documented exception; no component or prop covers it.
- **`.batchCell`** — see BENIGN above; tighter than `HStack`'s smallest preset. Documented exception, logged as LIB-2.

## Library findings surfaced

Flagged, not fixed — a migration doesn't change shared library code.

| #         | Gap                                                                                                                                                                                                                                                                                                                                                                                                         | Disposition                                                                                                                                                                                               |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LIB-1** | **No standard side-panel totals row.** `SIDE_PANEL.md`'s own "Known open items" records it: inbound bolds label + value, outbound only the label, and both did it with ad-hoc emphasis. Outbound's is now `Text variant="subtitle"` (semibold, no inline style) rather than bold — a local answer, not a shared one; this is the second panel carrying the pattern, which is the doc's own promote trigger. | `SIDE_PANEL.md` decision + an [`ADDING_A_COMPONENT.md`](../../ui/docs/ADDING_A_COMPONENT.md) task for a `SidePanelSubheading`-style total row. **The one side-panel item this migration did not settle.** |
| **LIB-2** | **`HStack` has no gap tighter than `sm` (`--space-2`).** A tight in-cell "value + marker" row (`--space-1`) can therefore only be a section CSS module. `HStack`'s doc deliberately defers such additions ("add an `inline` opt-in _then_ rather than pre-building it").                                                                                                                                    | Note only — a judgement for the library owner, not a defect.                                                                                                                                              |
| **LIB-3** | **No way to tone an icon semantically** — already logged under `inbound-shipments`' LIB-3; outbound's list is one of the six sections it names. F16 fixes only the inline-flex wrapper here, not the icon tone.                                                                                                                                                                                             | Already filed as an `ADDING_A_COMPONENT.md` task. No new entry.                                                                                                                                           |

## Your visual pass — the part this migration can't sign off

Static checks can't catch "compiles clean but looks wrong", and **no dev server is running for this worktree** (port 3005 belongs to the main checkout), so nothing here has been rendered. In **light and dark**:

| Route / surface                            | Compare against                                                                | Watch for                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/:storeId/distribution/outbound-shipment` | `#/showcase/table`; `StocktakesList`                                           | chips now in the table toolbar (shrink-to-content, one clear affordance); **column widths + drag-resize** on all six converted columns; the name cell's swatch–name gap; empty state                                                                                                                                                                                                   |
| `.../outbound-shipment/:id` — Details tab  | `#/showcase/header`, `#/showcase/page-layout`; the stocktake + inbound details | the header now labels-above (`HeaderToolbar`) and wraps as a unit; the item search as a permanent chip; **17 column widths**; the mono Code/Batch columns                                                                                                                                                                                                                              |
| `.../outbound-shipment/:id` — Log tab      | any `ActivityLogPanel` consumer (internal orders, requisitions, stock)         | it is now the **shared** panel — Date · Time · User · Event · **Details**, oldest-first, with localised event names in place of the old hand-humanised enum                                                                                                                                                                                                                            |
| `.../outbound-shipment/:id` — side panel   | `#/showcase/side-panel`; `SIDE_PANEL.md` sign-off checklist                    | field/row **rhythm**; the comment now multi-line; input heights consistent; the picked-date field's width beside its reason bubble                                                                                                                                                                                                                                                     |
| `.../outbound-shipment/:id` — footer       | `SupplierReturnStatusFooter`                                                   | the labelled **Close**, and its phone-width collapse                                                                                                                                                                                                                                                                                                                                   |
| Line editor (row click, and Add item)      | the **inbound + stocktake line editors**, side by side                         | the batch grid is now **cards** — each card's header must show a captioned **Batch** value (it rendered empty on the first attempt) plus the tick/On-hold badges, with Pricing + Other collapsed; that the Packs-issued input is still the obvious focus; then that the table-view toggle still works. Plus: grid-footer alignment, warning-banner rhythm, the variant popover's table |
| Detail view **first load**, wide + narrow  | any migrated sibling detail view                                               | the side panel's default: open at ≥1536px, closed below — then **close it and reload**, and confirm it stays closed (the F22 fix; it previously reopened)                                                                                                                                                                                                                              |
| Every dialog in the vertical (8)           | `#/showcase/forms`; `ConfirmDialog`                                            | **button tone** — icon-less Cancel/OK/Save, and `danger` on the three delete paths                                                                                                                                                                                                                                                                                                     |

Two judgement calls in the diff that only rendering can settle, so they're worth a deliberate look:

1. **The group-heading tooltip gap.** `groupHeading` now wraps the label + info icon in `HStack gap="sm"` (`--space-2`), where the old inline style used `--space-1`. `HStack` has no tighter preset ([LIB-2](#library-findings-surfaced)), so if it reads too airy beside the heading the answer is an `xs` gap on `HStack`, not a return to the inline style.
2. **The Log tab's new column count.** One column became two. It follows `CELL_TYPES.md` and seven sibling tables, and the spec names only "who, when" — but it is the one change in this migration that alters what the screen _contains_ rather than how it looks.
