# Supplier returns — UI migration report

Audit of the whole `supplier-returns` vertical against the eleven dimensions in [`MIGRATING_A_VERTICAL.md`](../../ui/docs/MIGRATING_A_VERTICAL.md). Judged against the rules, the [component registry](../../../spec/ui-standards/components.md), the reference vertical (`src/sections/stocktakes/`), and the sibling verticals that fill the roles stocktakes lacks — the near-identical twin `customer-returns`, plus `inbound-shipments` (migrated), `outbound-shipments`, `internal-orders`, `prescriptions`, `names`.

**Status: migrated and verified — `pnpm check` green, `pnpm test` green (1048 tests), reactivity re-checked clean over the finished diff. The operator's visual pass is outstanding.**

**One finding (F15 — the list's filter bar sitting in the page header instead of the table toolbar) was missed by the audit and caught by the spec owner on review**; it is fixed, and the coverage table below reflects the corrected judgement for L1.

Two design-owner rulings after the first pass changed the outcome of one finding and added another — **F10 (footer Close) was reversed** and **F16 (Export/Print emphasis)** was added; see both below. **F13 (two label keys) was declined** — the current wording stays and the spec is left alone; the Created column still moved onto the shared `createdDatetime` cell definition so the table system types it like every other date column.

**One spec edit is now pending sign-off** (F10) — see [Spec edits](#spec-edits--one-pending-sign-off).

## Coverage table

Rows are the vertical's screens and composed pieces; every cell is now `✅`. Dimensions: 1 registry/C3 · 2 screen composition · 3 tables · 4 inputs · 5 detail/side panel · 6 styling · 7 reactivity · 8 types · 9 a11y · 10 test hooks · 11 spec consistency.

L1's dimension 2 and 3 cells were `✅` in the audit and should not have been — see **F15**. They are green now because the filter bar moved, not because it was ever right.

| Screen / piece                          | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  |
| --------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **L1** List screen                      | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **L2** List filters                     | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **L3** Supplier-selection modal (S2)    | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **L4** List actions (Delete · Export)   | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D1** Detail view shell                | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D2** Detail header toolbar            | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D3** Side panel                       | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D4** Status footer                    | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D5** Log tab                          | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D6** Detail actions (Status · Export) | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **M1** Return-items modal (S4)          | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **M2** From-shipment modal (S4)         | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **M3** Return-from-inbound entry action | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **M4** Wizard line columns (both grids) | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |

`—` = the dimension has no surface on that piece.

**Clean before any change: dimension 7 (reactivity), and dimension 8 bar one avoidable cast.** Notes on why below.

## Findings

### F1 — Inline `style` building layout / colour (dim 1 C3, dim 6) · 4 sites

**Rule:** [reach-for order](../../ui/docs/MIGRATING_A_VERTICAL.md#the-reach-for-order) step 5 — an inline `style` is always a finding; registry [Layout › horizontal stack](../../../spec/ui-standards/components.md#layout): "A hand-rolled flex row here is a bespoke look-alike (C3)".

| Site                                                                       | Was                                                                      | Now                                                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| [SupplierReturnsList.tsx:259](list/SupplierReturnsList.tsx#L259)           | `<span style={{display:'inline-flex',…}}>` around the Name cell          | `<HStack gap="sm">` — the fix inbound already applied to the identical cell                                      |
| [SupplierReturnSidePanel.tsx:99](detail/SupplierReturnSidePanel.tsx#L99)   | inline-flex span, Edited-by username + info affordance                   | `<HStack gap="sm">` (see also **F4**)                                                                            |
| [SupplierReturnSidePanel.tsx:164](detail/SupplierReturnSidePanel.tsx#L164) | inline-flex span, `justify-content: space-between`, shipment line + link | `<HStack gap="md" justify="between">` (see also **F3**)                                                          |
| [ReturnItemsModal.tsx:370](detail/edit-modal/ReturnItemsModal.tsx#L370)    | `<p style={{color:'var(--text-secondary)'}}>` — the pick-an-item hint    | `<Text variant="body" class={styles.hint}>` + `.hint { color: var(--text-secondary) }` in the section CSS module |

`Text` carries size/weight only and deliberately never colour, so the muted hint is the sanctioned CSS-module case — seven verticals already solve it exactly that way (`internal-orders`, `items`, `prescriptions`, `settings`, `sync-modal`).

**Note (out of scope):** the same inline-styled Name-cell wrapper survives in five sibling lists and in `src/domain/name/NameSearch.tsx` — logged as LIB-3 by the inbound migration. Binding rules aren't negotiable by prevalence, so supplier returns is fixed here; the sweep stays a separate task.

### F2 — The detail header was a hand-rolled `Toolbar` + `Stack` + `FieldRow`, not `HeaderToolbar` (dim 2, 1, 4)

[SupplierReturnDetailView.tsx:355](detail/SupplierReturnDetailView.tsx#L355) + [SupplierReturnToolbar.tsx](detail/SupplierReturnToolbar.tsx).

**Rule (binding, and the registry's own words):** [Screen structure › app bar — page content](../../../spec/ui-standards/components.md#screen-structure-regions) — "a detail screen's header fields use `HeaderToolbar`, which fixes their layout (each field labelled above its control, equal shares wrapping as a unit) **so every detail header reads alike** — `Toolbar` stays for other content (a list's filter bar)". The vertical instead stacked two `FieldRow`s (inline bold label, `hideLabel` on the control) inside the generic `Toolbar`.

The reference vertical and every migrated sibling agree: [`StocktakeDetailToolbar.tsx:41`](../stocktakes/detail/StocktakeDetailToolbar.tsx#L41), [`InboundShipmentDetailToolbar.tsx`](../inbound-shipments/detail/InboundShipmentDetailToolbar.tsx) (+ [its view:924](../inbound-shipments/detail/InboundShipmentDetailView.tsx#L924)), `prescriptions`, `patients`.

**Fixed:** the view wraps the cluster in `<HeaderToolbar>`; the toolbar component dropped the `Stack` + `FieldRow` scaffolding and renders each field with its own label above a `size="small"` control; `CustomFieldsToolbar` gained `layout="field"` — the prop that exists precisely for this host ([CustomFieldsToolbar.tsx:26-33](../../domain/customFields/CustomFieldsToolbar.tsx#L26)). No banner is passed to the `alert` slot: a supplier return has one forward-only lifecycle and no standing context to state.

**Note:** `customer-returns` carried the same drift when this was audited and **has since been migrated the same way** in [#793](https://github.com/msupply-foundation/open-msupply-frontend/pull/793) — its toolbar is now a `HeaderToolbar` of `size="small"` label-above fields, arrived at independently. `internal-orders` still has the drift: a separate sweep.

### F3 — Related-documents link was a bare `<A>` (dim 1)

[SupplierReturnSidePanel.tsx:183](detail/SupplierReturnSidePanel.tsx#L183). Registry [`RecordLink`](../../../spec/ui-standards/components.md#typography): "A hand-rolled toned `<A>` for a related record is a bespoke look-alike (C3)". The **twin vertical already did it correctly** for the mirror-image link — [`CustomerReturnSidePanel.tsx:182`](../customer-returns/detail/CustomerReturnSidePanel.tsx#L182).

**Fixed:** `RecordLink`, no `kind` (a shipment is a neutral reference), same `#N` label and route.

### F4 — Edited-by info affordance hand-rolled a `Popover` (dim 5)

[SupplierReturnSidePanel.tsx:109](detail/SupplierReturnSidePanel.tsx#L109) built `Popover trigger={<InfoIcon/>} openOnHover placement="top"` with a `<p>` body — which is [`InfoTooltip`](../../ui/elements/feedback/InfoTooltip.tsx) exactly, the component dimension 5 names. The twin uses it; inbound's F15 landed the same.

**Fixed:** `<InfoTooltip text={email()} label={email()} />`.

### F5 — Dialog footers ignored `StandardButtons` and D55 (dim 5, dim 1) · 11 footers across 9 dialogs

**Rule:** registry [Modal footer button](../../../spec/ui-standards/components.md#buttons--status) → `CancelButton` / `DialogSaveButton` / `SaveAndNextButton`, "never OK/OK & next, **never an icon**"; [D55](../../../spec/DIVERGENCES.md) is binding and "applied app-wide" — and it keeps `OkButton` for the genuinely-not-a-save acknowledgement.

| Site                                                                                  | Was                                                        | Now                                                                                                            |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [SupplierReturnsList.tsx:439](list/SupplierReturnsList.tsx#L439)                      | `Button secondary` + `CheckIcon`, `button.ok`              | `OkButton`                                                                                                     |
| [SupplierReturnDetailView.tsx:306](detail/SupplierReturnDetailView.tsx#L306)          | same                                                       | `OkButton`                                                                                                     |
| [SupplierReturnSidePanel.tsx:243](detail/SupplierReturnSidePanel.tsx#L243)            | same                                                       | `OkButton`                                                                                                     |
| [NewReturnModal.tsx:79](list/NewReturnModal.tsx#L79)                                  | `Button secondary` + `XCircleIcon`, `button.cancel`        | `CancelButton`                                                                                                 |
| [DeleteReturnsAction.tsx:80](list/actions/DeleteReturnsAction.tsx#L80)                | OK with icon                                               | `OkButton`                                                                                                     |
| [DeleteReturnsAction.tsx:150](list/actions/DeleteReturnsAction.tsx#L150)              | Cancel(icon) · Delete `secondary`(icon) · OK(icon)         | `CancelButton` · `Button variant="danger"` (F6) · `OkButton`                                                   |
| [StatusChangeAction.tsx:150](detail/actions/StatusChangeAction.tsx#L150)              | Cancel(icon) · confirm `primary`(icon) · OK(icon)          | `CancelButton` · `Button` (custom verb, **icon dropped**) · `OkButton`                                         |
| [StatusChangeAction.tsx:190](detail/actions/StatusChangeAction.tsx#L190)              | OK(icon)                                                   | `OkButton`                                                                                                     |
| [ReturnFromInboundAction.tsx:70](detail/edit-modal/ReturnFromInboundAction.tsx#L70)   | OK(icon)                                                   | `OkButton`                                                                                                     |
| [ReturnItemsModal.tsx:292](detail/edit-modal/ReturnItemsModal.tsx#L292)               | Cancel/Back · Next step · Save · Save & next (raw Buttons) | `CancelButton` · `DialogSaveButton` · `SaveAndNextButton`; Back + Next step stay `Button` (non-standard verbs) |
| [ReturnFromShipmentModal.tsx:218](detail/edit-modal/ReturnFromShipmentModal.tsx#L218) | Cancel/Back · Next step · Save (raw Buttons)               | same treatment                                                                                                 |

The two wizard footers were already icon-less with the right verbs (their comments cite D55) — only the pre-composed components were missing, which is what keeps labels and tone from drifting. Dialog **title** icons (`Dialog icon={…}`) stay: D55 covers footer actions, and inbound kept its title icons.

### F6 — The bulk delete wasn't `danger` (dim 5)

Dimension 5: "button-variant semantics (delete = `danger`)"; registry `ConfirmDialog`: "`danger` for a destructive action". [DeleteReturnsAction.tsx:60](list/actions/DeleteReturnsAction.tsx#L60) (footer trigger) and its confirm were both `variant="secondary"`. The reference vertical ([`DeleteStocktakesAction.tsx:51`](../stocktakes/list/actions/DeleteStocktakesAction.tsx#L51)) and migrated inbound both use `danger`.

**Fixed:** both → `variant="danger"`; labels and testids unchanged. (Outbound and customer-returns still show `secondary` — #793 migrated the twin's list but left its delete tone alone, so this stays a cross-vertical sweep.)

### F7 — No column-width presets on any table (dim 3) · 5 tables

**Rule:** the table dimension + [`CELL_TYPES.md`](../../ui/docs/CELL_TYPES.md) — a bare helper sets **no `size`**, so the column renders at a wrong default width and can't be dragged sensibly. Widths live per key in [`_globalColumnConfig.ts`](../../ui/elements/table/_globalColumnConfig.ts). Eight verticals had adopted `getCellDefinition` (including the reference vertical's list); supplier returns used none.

| Table                | → `getCellDefinition(key)`                                                                                                                      | No `CELL_DEF` key → explicit helper + call-site `size`                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **L1** list          | `otherPartyName`, `invoiceNumber`, `createdDatetime`, `comment`, `theirReference`                                                               | `status` `7.5`/`9.375` (Status is a page-rendered cell type)                                               |
| **D1** detail lines  | `itemCode` (on the `item.code` column), `itemName`, `batch`, `expiryDate`, `unit`, `packSize`, `numberOfPacks`, `costPricePerPack`, `lineTotal` | `totalQuantity` `7`                                                                                        |
| **D5** Log           | `date`, `time`, `user`                                                                                                                          | `event` `12` (`getTextCell({wrapLines:2})`)                                                                |
| **M4** quantity grid | `itemCode`, `itemName`, `batch`, `expiryDate`, `unit`, `packSize`                                                                               | `availableNumberOfPacks` `10` ("Quantity available for return"), `onHold` `5`, `numberOfPacksToReturn` `9` |
| **M4** reason grid   | `itemCode`, `itemName`, `batch`, `expiryDate`, `note`                                                                                           | `returnReasonInput` `10`                                                                                   |

Both wizard grids render in **table** view inside a `size="large"` dialog (no card-only default), so their widths do render — unlike inbound's card-only line editor, this was not benign.

**The Unit column takes the `unit` preset, not `unitName`.** Both are the same cell type (short text); `unitName`'s per-key `size: 2` is narrower than the header word "Unit" itself, so the first render of this table had the **Unit and Pack size headers touching** (caught by driving the app, not by any static check). `unit` (8rem) allows for the header, and is what the three other verticals heading this column `label.unit` use — the items list, the stock list, and the inbound Financial tab. The preset itself is a library problem → **LIB-4**.

### F8 — The wizard context row hand-rolled a flex row and a breakpoint (dim 1, dim 6)

[ReturnItemsModal.module.css](detail/edit-modal/ReturnItemsModal.module.css), used by both wizard hosts. Two things: a `display:flex` row where the registry has a component ([Two-up form row → `FormRow`](../../../spec/ui-standards/components.md#layout)), and a **`@media (max-width: 599px)`** rule doing the wrapping, where `src/ui/CLAUDE.md` #7 reserves breakpoints for deciding _which element renders_, never layout nudges.

**Fixed:** `<FormRow>` in both hosts; the module now holds only `.hint` (F1), and `ReturnFromShipmentModal` no longer imports it at all.

**Trade-off:** the media query also used `subgrid` so both stacked `FieldRow`s shared one label-column width. `FormRow` gives no cross-child label alignment, so when stacked the two labels size independently. Recorded as **LIB-2** rather than a reason to keep a bespoke breakpoint — worth an eye in the visual pass at a narrow width.

### F9 — The list colour cell omitted `variant="row"` (dim 1)

[SupplierReturnsList.tsx:272](list/SupplierReturnsList.tsx#L272). Registry [Colour tag](../../../spec/ui-standards/components.md#buttons--status): "`variant` = **`row` (list cell)** / `field`". Outbound, prescriptions and (post-migration) inbound all pass it.

**Fixed:** `variant="row"` added. No visual change (only `field` carries a trigger class) — this is the registry contract, not a repaint. The dot/picker gate itself was already right, and is what inbound copied from here.

### F10 — The footer Close — **REVERSED, the finding was wrong** (dim 1, 2, 11)

**What the audit claimed:** the footer's labelled `Button variant="secondary" icon={<XCircleIcon/>}` should be an icon-only `IconButton`, citing the vertical's spec ("**Close** (`button.close`, icon-only)" — [ui-surface S3 § Layout](../../../spec/supplier-returns/ui-surface.md)) and the two shipment footers that render it that way ([inbound](../inbound-shipments/detail/InboundShipmentStatusFooter.tsx#L116), [outbound](../outbound-shipments/detail/OutboundStatusFooter.tsx#L109)). It was changed, then the design owner asked for a proper Close button back (2026-07-30).

**Why the audit got it wrong:** I counted two verticals and stopped. The full count is **3 labelled vs 2 icon-only** — `customer-returns`, `internal-orders` and `prescriptions` all render `<Button variant="secondary" icon={<XCircleIcon/>}>Close</Button>`, and the **reference vertical has no footer Close at all**, so it could not arbitrate. A cross-vertical check that stops at the first agreeing pair isn't a majority; the sibling sweep has to be exhaustive or it just confirms whatever it found first.

**Now:** back to the labelled `Button variant="secondary" icon={<XCircleIcon/>}` with `data-testid="close-button"` — i.e. the original code, matching the majority. A footer action reads as a verb beside the status split button, not as a glyph.

**Consequence — a spec edit is needed** so `spec-build` doesn't reintroduce the icon-only Close: this is a **pure-UI** conflict, so the standards + house pattern win and the spec moves. See [Spec edits](#spec-edits--one-pending-sign-off).

### F16 — Export/Print carries no emphasis (dim 5) · design-owner instruction, **one open question**

[ExportPrintAction.tsx:23](detail/actions/ExportPrintAction.tsx#L23) was `variant="secondary"`; the design owner asked for `primary` (2026-07-30). Applied.

Two things this raises, neither of which blocks the change:

1. **On an editable return it puts two filled primaries in one region.** The header cluster is Add item (`primary`, the default `Button`) · Export/Print · More, and [`controls.md`](../../../spec/ui-standards/controls.md) opens with "One **primary** action per region; alternatives are secondary/low-emphasis." Verified live: an editable return now shows Add item **and** Export/Print both filled, plus the footer's Confirm split button. On a read-only return Add item is hidden, so Export/Print is the only emphasised action and the rule holds — which is likely the state that prompted the request. **Open for a ruling** (recorded in [Decisions](#decisions)).
2. **All five verticals with this action use `secondary`** (stocktakes, inbound, outbound, customer returns, supplier returns). Supplier returns is now the outlier; if the intent is app-wide, it's a one-line change in four more files plus possibly a `controls.md` amendment.

### F11 — The side-panel Comment was single-line where the spec says multi-line (dim 4, dim 11)

[SupplierReturnSidePanel.tsx:126](detail/SupplierReturnSidePanel.tsx#L126) used `TextField`; [ui-surface S3 § side panel](../../../spec/supplier-returns/ui-surface.md) says "**Comment** (`label.comment`, **multi-line** in-place)", and the registry maps Multi-line → `TextArea`. Three siblings render this exact field as a `TextArea` ([inbound:246](../inbound-shipments/detail/InboundShipmentSidePanel.tsx#L246), internal-orders, prescriptions); four use `TextField` — so the house pattern was split and **this vertical's spec was the tie-breaker**.

**Fixed:** `TextArea` with inbound's props (`hideLabel`, `width="full"`); the `comment-field` testid is unchanged and still lands on the editable element.

### F12 — Test hooks (dim 10)

Contract: [`e2e/TESTIDS.md`](../../../e2e/TESTIDS.md). Supplier returns has **no vertical block**, so it lives on the shared ids — `dialog-button-<variant>` (line 26), `confirmation-modal-ok` (28), `delete-lines-button` (128), `actions-footer` / `selected-rows-count` (36-38). The list and both wizards were complete; five dialog buttons a suite would reach for carried no id: `DeleteReturnsAction`'s Cancel (`dialog-button-cancel`) and its blocked/error OKs, `StatusChangeAction`'s no-lines OK, and `ReturnFromInboundAction`'s notice OK (`dialog-button-ok`).

**Fixed** as part of F5's rewrite (the `StandardButtons` pass `data-testid` straight through). No id invented, none duplicating a component-emitted one. No deterministic suite covers this vertical yet, so nothing was at risk of breaking.

### F13 — Two labels drift from the spec's transcription (dim 11) · **DECLINED**

The list's Created column reads `label.created` ("Created") where S1 names `label.created-datetime` ("Created date"), and the side panel shows "Edited by" where S3 says "Entered by". Raised as the audit's one judgment call; the spec owner ruled (2026-07-30) to **keep the current wording and leave the spec unchanged** — three sibling lists and the customer-returns twin show these strings, and app-wide consistency wins here.

What did change: the Created column now takes `getCellDefinition('createdDatetime')`, so the table system types and sizes it as the same kind of column as every other date — the part of this finding that was never about wording.

### F15 — The list's `FilterBar` was in the page header, not the table toolbar (dim 2, dim 3)

**Missed by the first audit pass** and caught by the spec owner on review — L1's dimensions 2 and 3 were wrongly marked clean.

[SupplierReturnsList.tsx](list/SupplierReturnsList.tsx) wrapped the `FilterBar` in a `<Toolbar>` inside the page `<Header>`. The rule is binding and explicit — [`tables.md` § toolbar](../../../spec/ui-standards/tables.md): "The filter bar **MUST** render in this table toolbar — never in the page header / app bar, and never in a separate page-level toolbar band above the table. This binds every table, list or detail, and **overrides any vertical spec** that places filters elsewhere: a vertical states its filter _set_, never its _location_." `DataTable` carries the slot for exactly this and says so at its `filters` prop: "filters live WITH the table, not the page header".

**Every** other list already does it — including the reference vertical ([`StocktakesList.tsx:343`](../stocktakes/list/StocktakesList.tsx#L343)) and `inbound-shipments`, `names`, `items`, `locations`, `stock`. Supplier returns was the only holdout, so nothing about this was a judgment call.

**Fixed:** the `<Toolbar>` band is gone from the Header (which is now `Breadcrumb` + `HeaderButtons`, matching the reference vertical), and the same `FilterBar` element — custom-field `extra` and all — is passed to `DataTable`'s `filters` prop. Filter state stays page-owned and URL-backed; only the placement moved.

**Why the audit missed it:** I judged the header region against `#/showcase/header` and the registry's "standard list screen" row, which lists `Toolbar` and `FilterBar` as sibling parts of the composition without saying which hosts which — and I never opened `tables.md` § toolbar, the one doc that fixes it. The detector for this belongs in the dimension-3 sweep (where does the FilterBar render?), not the header sweep.

### F14 — An avoidable `as` cast (dim 8)

[SupplierReturnDetailView.tsx:448](detail/SupplierReturnDetailView.tsx#L448) had `(editState() as { itemId: string }).itemId`. The union already carries `itemId` on the `'update'` arm; re-calling the accessor is what lost the narrowing.

**Fixed:** an `editItemId()` accessor narrows once, no cast. (`status as AdvanceTarget` in [StatusChangeAction.tsx](detail/actions/StatusChangeAction.tsx#L73) stays: `SplitButton.onAction` is typed `(value: string)`, so that one is a genuine library-boundary narrowing.)

## Why two dimensions were clean before any change

- **Dim 7 (reactivity).** The list's `data.latest` / `prefs.latest` reads and `customFieldDefinitions(…).noSuspense()` match the reference vertical exactly; the Log tab — a resource that first fetches on a _tab interaction_ — carries the strict `.state === 'ready' || 'refreshing'` gate with the pitfall cited in a comment; the detail resource is only ever `mutate`d (never refetched) behind a non-keyed `<Show>`, so no save can re-suspend the open screen; both wizards load sequentially into a store with `reconcile(…, {key:'id'})` and mount keyed per open.
- **Dim 8 (type safety).** Filters _are_ the generated `InvoiceFilterInput`, and `constructFilters`' exhaustive record makes a new schema filter a compile error; row/line types are `Extract<>`s off the generated results, never parallel shapes; the type pin lives in the fetcher, not the URL state. One avoidable cast (F14).

## Cross-check against the twin, migrated in parallel

`customer-returns` — the mirror-image vertical — was migrated independently in [#793](https://github.com/msupply-foundation/open-msupply-frontend/pull/793) while this was in flight, and landed in `main` before this PR. Its choices were compared file-by-file against this one after merging: **the two agree on every shared decision**, reached separately.

| Decision                         | Twin (#793)                            | Here                 |
| -------------------------------- | -------------------------------------- | -------------------- |
| List filter bar                  | `DataTable` `filters` slot             | same (**F15**)       |
| Detail header                    | `HeaderToolbar`, `size="small"` fields | same (**F2**)        |
| Side-panel rows / info / comment | `HStack` · `InfoTooltip` · `TextArea`  | same (**F1/F4/F11**) |
| Column widths                    | `getCellDefinition` + `remToPx`        | same (**F7**)        |
| Wizard context row               | CSS module deleted                     | same (**F8**)        |
| Dialog footers                   | `StandardButtons`                      | same (**F5**)        |

Two differences worth recording, neither a defect here:

- **The twin's footer Close was not in its migration**, so it is still a hand-rolled labelled `Button` — the first consumer of the new `CloseButton` is this vertical, and the twin is the obvious next adopter.
- **The twin added a purpose-made hint string** (`messages.select-item-to-return`) where this vertical's wizard reuses `placeholder.enter-an-item-code-or-name` as its empty-state hint. Same surface, different copy. Aligning them is a **content** change the spec doesn't fix either way, so it is left alone here rather than changed silently.

## Reactivity re-check

Re-run with the `check-reactivity` skill over the finished diff: **no reactivity findings.** The changes are composition-only — no resource read, effect, store write or `<Show keyed>` was touched. Four things confirmed benign: `HeaderToolbar` and `IconButton` each read their JSX-element props exactly once (§3); the `StandardButtons` spread the whole props proxy into `Button`, so `loading` / `disabled` stay reactive across the wrapper; `initialItemId={editItemId()}` is read inside JSX, so the narrowing helper is as reactive as the inline ternary it replaced; and `FormRow` / `HStack` are pure layout wrappers whose children keep their own tracking scopes.

## Spec edits — one pending sign-off

**F10's reversal needs one spec edit.** [`spec/supplier-returns/ui-surface.md`](../../../spec/supplier-returns/ui-surface.md) S3 § Layout describes the footer's Close as `button.close`, **icon-only**. The implementation now renders a labelled button — the treatment three of the five detail footers use — so as it stands the spec and the code disagree, and the next `spec-build` would put the glyph back.

This is a **pure-UI** conflict (which control fills the role, how it presents), so per dimension 11 the standards + house pattern win and the **spec moves**:

- Drop "icon-only" from the Close bullet in S3 § Layout — the bullet names the action and its key, not its presentation. Suggested wording: **Close** (`button.close`), leaving the treatment to the shared standards.
- No [`DIVERGENCES.md`](../../../spec/DIVERGENCES.md) entry is implied: this is not a deliberate difference from the reference app, just presentation the vertical's spec should not have been fixing.

**Not made yet** — spec edits are never silent. Say the word and it's a one-line change.

## Decisions

**D1 — Export/Print `primary` leaves two primaries in the header when Add item shows (F16).** [`controls.md`](../../../spec/ui-standards/controls.md) allows one primary per region. The change is in as instructed; the question is how to resolve the editable state:

- **(a) Export/Print primary only while Add item is hidden** — the leading _available_ action carries the emphasis; satisfies the rule in both states and matches what a read-only return needed (my recommendation).
- **(b) Demote Add item to `secondary`** — honours the instruction literally, but takes the emphasis off the vertical's main editing action.
- **(c) Keep both primary** — needs `controls.md` amended (and then ideally the same treatment app-wide), since it contradicts a binding rule rather than a local preference.
- **(d) Revert to `secondary`** — if the read-only header's lack of emphasis is better solved another way.

Whichever way it goes, the other four verticals' Export/Print buttons are still `secondary` and would need the same call.

## Checked and deliberately left alone

- **The selection footer stays a page `ContentFooter`.** `DataTable` now offers a `selectionActions` slot, but only `inbound-shipments` and `internal-orders` use it; `DataTable`'s own comment records the transition ("Pages not yet migrated (no `selectionActions`) keep their own footer"), and the reference vertical plus four siblings still compose the page footer. Moving supplier returns alone would put it ahead of the reference vertical on an in-progress library migration — a separate sweep when that slot becomes the house pattern. Verified while fixing **F15**, so it is a recorded decision, not an unexamined gap.
- **The detail line table has no filter bar**, and its spec names no filters — so dimension 3's "a vertical's list and detail must match" is satisfied trivially.

## Out of scope — spec-owned behaviour gaps (not migration work)

Found by the dimension-11 durability check. The spec wins, so these are implementation gaps — but they are behaviour/content, and migration "changes UI composition only":

- **List report selector.** [S1 § Layout](../../../spec/supplier-returns/ui-surface.md) lists three page actions: New return · Export CSV · "the shared **report selector** button". Only the first two exist.
- **Line-table selection + bulk bar.** S3 § Layout says "On selection, the bulk-action bar replaces this row: selected count · Delete · clear selection". The detail line table has no selection at all (nor does the customer-returns twin), and S3 § Actions names no delete-lines action — so this may be boilerplate in the Layout bullet rather than intended behaviour. Worth a spec-owner glance.
- **Group by item.** S3's line table is specified grouped by item with a toggle; the spec **already records the `DataTable` gap** inline (⚠️ Component gap) and sanctions the flat rendering. No action here beyond LIB-1.

## Library findings surfaced

Flagged, not fixed — a migration doesn't change shared library code unasked.

| #         | Gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LIB-1** | `DataTable` has **no table-view row grouping** — already filed by the inbound migration; it is what blocks S3's "Group by item" here too.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Existing library issue; the spec already documents the gap.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **LIB-2** | `FormRow` gives its children **no shared label column** when it wraps to stacked, so two `FieldRow`s stacked in one row have independently-sized label columns (what F8's hand-rolled `subgrid` bought).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Note / small [`ADDING_A_COMPONENT.md`](../../ui/docs/ADDING_A_COMPONENT.md)-shaped enhancement (a `subgrid` opt-in on `FormRow`). Low priority.                                                                                                                                                                                                                                                                                                                               |
| **LIB-3** | No way to **tone an icon semantically** — inherited note from the inbound migration; not exercised by this vertical, listed only because F1's sweep note points at it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Existing task.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **LIB-5** | **No way to make a header field cluster's inputs narrower.** Asked for by the design owner (2026-07-30): "a narrower variant of the inputs, one size down". (i) The input `size` scale is exactly `'default' \| 'small'` and the header is already `small` — there is no third, denser step. (ii) Narrowing by _width_ can't be done from a vertical either: the width caps (`compact` 10rem / `short` 25rem / `long` / `full`) exist on `TextField` and `Combobox`, but **`NameSearch` doesn't forward `width`** and **`CustomFieldInput` hardcodes `width="full"`**, so two of the three fields in this header can't be capped at the call site. (iii) `HeaderToolbar`'s `minFieldWidth` sets the flex basis / wrap threshold, not a growth cap, so it can't narrow fields when there is spare room. | Library task, design owner's call on which shape: a **max field width on `HeaderToolbar`** (one knob, every detail header stays consistent — the recommendation), a third `size` step across the input set (bigger: tokens + every input + the showcase), or `width` pass-throughs on `NameSearch` / `CustomFieldInput`. Out of a migration's scope either way; capping only the one field this vertical owns would leave the cluster visibly uneven, so nothing was changed. |
| **LIB-4** | The `unitName` width preset is **`size: 2` rem — narrower than the "Unit" header it sits under**, so any column using it collides with its neighbour (seen live here before F7 switched to the `unit` key). Every other `CELL_DEF` key whose header is wider than its content carries a per-key `size` with a comment naming the header ("Pack size", "Difference"); `unitName` is the outlier, uncommented. **`inbound-shipments`' detail line table uses `unitName` under the same `label.unit` header**, so it very likely shows the same collision.                                                                                                                                                                                                                                                | File an issue against [`_globalColumnConfig.ts`](../../ui/elements/table/_globalColumnConfig.ts) — either widen `unitName` to allow for the header or delete the key so consumers fall to `unit`. Changing a shared preset is out of a migration's scope; flagged, not fixed.                                                                                                                                                                                                 |

## Boutique / uncovered elements

- **The muted wizard hint line** ([ReturnItemsModal.tsx:370](detail/edit-modal/ReturnItemsModal.tsx#L370)) — `Text` + a scoped class. **(c) A deliberate, documented exception**: `Text` carries size/weight only and never colour; seven verticals already solve it this way.
- **Row grouping** (detail line table) — cannot be covered at all. **(b) Blocked on a library gap** → LIB-1; the spec sanctions the flat table meanwhile.
- **Stacked label alignment in the wizard context row** — the `subgrid` refinement `FormRow` doesn't offer. **(a) A candidate library enhancement** → LIB-2.

Nothing else in this vertical needed a component the library lacks: every role in scope resolves to a ✅ registry row, and no ⛔ role was rendered.

## What was checked by driving the app

Prompted by the F15 miss, the list and detail were opened in the running app (this worktree's dev server, the `OMS` store's 3 returns) rather than reasoned about. That confirmed the two structural fixes — the filter bar now sits in the table's own toolbar beside the column/full-screen controls, and the detail header reads as three equal-share label-above fields (Supplier name · Supplier reference · Category) with the icon-only Close in the footer — and **caught one regression the static checks passed**: the detail line table's colliding Unit / Pack size headers (see F7 and LIB-4).

This is a spot check on one record in one store and light theme only — it does **not** replace the operator's pass below.

## Your visual pass — the part this migration can't sign off

Static checks pass, but they can't catch "compiles clean but looks wrong". Both screens plus the wizard, in **light and dark**:

| Screen                      | Route                                                     | Compare against                                                       |
| --------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| List                        | `/<storeId>/replenishment/supplier-return`                | `#/showcase/table` · `StocktakesList` · `InboundShipmentsList`        |
| Detail (+ tabs, side panel) | `/<storeId>/replenishment/supplier-return/<id>`           | `#/showcase/header`, `#/showcase/page-layout` · `StocktakeDetailView` |
| Return-items wizard (S4)    | detail → Add item, or a row click                         | `#/showcase/table` · the stocktake line editor                        |
| From-shipment wizard (S4)   | an inbound shipment at Delivered+ → Return selected lines | the same                                                              |

Worth looking hardest at, since these are what changed:

1. **The list's filter bar** (F15) — it has moved out of the page header into the table's own toolbar, beside the column/full-screen controls. Check the chips shrink to content, the "add a filter" affordance reads as one control, and the header now sits at the same height as every other list's.
2. **The detail header** — the biggest change by far: two fields moved from inline-label `FieldRow`s in a `Stack` to a label-above `HeaderToolbar` cluster, and prominent custom fields now wear their own labels beside them. Compare directly against the inbound and stocktake detail headers, and check the cluster wraps sensibly at 2 vs 3 fields.
3. **Column widths and resizing** — every column in five tables moved to a preset or an explicit width. Check nothing is comically narrow or truncating, that each column still drags, and that the two wizard grids read well inside the large dialog.
4. **The wizard context row at a narrow width** — now `FormRow`. Confirm it stacks cleanly, and judge whether the lost `subgrid` label alignment (LIB-2) is visible enough to matter.
5. **The side panel** — Comment is now a multi-line `TextArea` (does the panel still fit without pushing the pinned Actions section?), the Edited-by info icon is now `InfoTooltip`, and the shipment link is a `RecordLink` (neutral tone).
6. **The footer** — Close is now an icon-only button; check it reads as a control beside the split button and that its hover title appears.
7. **Dialog footers** — 11 changed label, tone or icon. The bulk delete should now read as destructive in both trigger and confirm.
