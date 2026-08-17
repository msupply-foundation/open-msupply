# Inbound shipments — UI migration report

Audit of the whole `inbound-shipments` vertical against the eleven dimensions in [`MIGRATING_A_VERTICAL.md`](../../ui/docs/MIGRATING_A_VERTICAL.md). Judged against the rules, the [component registry](../../../spec/ui-standards/components.md), the reference vertical (`src/sections/stocktakes/`), and the sibling verticals that fill the roles stocktakes lacks (outbound shipments, internal orders, supplier/customer returns, names).

**Status: migrated and verified — `pnpm check` green, `pnpm test` green (886 tests). The operator's visual pass is outstanding.**

**The side panel (D3) is deliberately out of scope.** A first attempt at its Charges sub-grouping was built and rejected by the spec owner (2026-07-30) and reverted; the panel's composition is being settled by a **separate design spec** instead. `InboundShipmentSidePanel.tsx` is left exactly as the audit found it, and its findings — the four `HStack`s in **F1**, plus **F13**, **F14** and **F15** — stay open, to be picked up under that design spec. Nothing else in the report depended on them.

The two [spec edits](#spec-edits-needed--sign-off-required) are signed off and made.

## Coverage table

Rows are the vertical's screens and composed pieces; each cell is `✅` or the finding count for that dimension. Dimensions: 1 registry/C3 · 2 screen composition · 3 tables · 4 inputs · 5 detail/side panel · 6 styling · 7 reactivity · 8 types · 9 a11y · 10 test hooks · 11 spec consistency.

| Screen / piece                        | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  |
| ------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **L1** List screen                    | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **L2** List filters                   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **L3** Create-flow orchestrator       | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **L4** Link-internal-order modal      | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **L5** Link-purchase-order modal      | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **L6** List actions (Delete · Export) | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D1** Detail view shell              | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D2** Detail header toolbar          | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D3** Side panel — **OUT OF SCOPE**  | ⏸   | ✅  | —   | ✅  | ⏸   | ⏸   | ✅  | ✅  | ✅  | ⏸   | ⏸   |
| **D4** Status footer                  | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D5** Financial tab                  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D6** Currency tab                   | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D7** Delivery tab                   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D8** Documents tab                  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D9** Log tab                        | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D10** Line-edit modal               | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D11** Detail modals (×3)            | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| **D12** Detail actions (×7)           | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |

`—` = the dimension has no surface on that piece (no table, no form). `⏸` = deferred to the side panel's design spec, not assessed as failing. The findings behind each cell are catalogued below, with what each fix became.

**Clean dimensions across the whole vertical: 2 (screen composition), 4 (inputs), 7 (reactivity), 8 (type safety).** Notes on why below.

## Findings

### F1 — Hand-rolled flex rows and inline `style` (dim 1 C3, dim 6) · 10 sites

**Rule:** the [reach-for order](../../ui/docs/MIGRATING_A_VERTICAL.md#the-reach-for-order) step 5 — an inline `style` is always a finding; registry [Layout › horizontal stack](../../../spec/ui-standards/components.md#layout): "A hand-rolled flex row here is a bespoke look-alike (C3)".

| Site                                                                                            | Now                                                                                                            | Fix                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [InboundShipmentsList.tsx:233](list/InboundShipmentsList.tsx#L233)                              | `<span style={{display:'inline-flex',…}}>` around the supplier cell                                            | `<HStack gap="sm">`                                                                                                                                                            |
| [InboundShipmentsList.tsx:247,249](list/InboundShipmentsList.tsx#L247)                          | `<HomeIcon style={{color:'var(--primary-main)'}} />` / `<TruckIcon style={{color:'var(--secondary-main)'}} />` | section CSS module class — icons paint with `currentColor` and take `class` (`IconProps = ComponentProps<'svg'>`), so a token-only `color` rule is enough. See also **LIB-3**. |
| [InboundShipmentSidePanel.tsx:176](detail/InboundShipmentSidePanel.tsx#L176)                    | inline-flex span, donor name + edit                                                                            | `<HStack gap="sm">`                                                                                                                                                            |
| [InboundShipmentSidePanel.tsx:275](detail/InboundShipmentSidePanel.tsx#L275)                    | inline-flex span, stock tax editor + amount                                                                    | `<HStack gap="sm">`                                                                                                                                                            |
| [InboundShipmentSidePanel.tsx:331](detail/InboundShipmentSidePanel.tsx#L331)                    | inline-flex span, service tax editor + amount                                                                  | `<HStack gap="sm">`                                                                                                                                                            |
| [InboundShipmentSidePanel.tsx:363](detail/InboundShipmentSidePanel.tsx#L363)                    | inline-flex span, currency code + edit                                                                         | `<HStack gap="sm">`                                                                                                                                                            |
| [InboundShipmentLogPanel.tsx:91](detail/log/InboundShipmentLogPanel.tsx#L91)                    | inline-flex **column**, `gap:'0.25rem'` (a literal, not a token)                                               | `<Stack gap="sm">`                                                                                                                                                             |
| [InboundShipmentLineEditModal.tsx:180](detail/edit-modal/InboundShipmentLineEditModal.tsx#L180) | `StatusDot` built from 5 inline style declarations                                                             | see **F2**                                                                                                                                                                     |
| [LinkInternalOrderModal.tsx:116](list/LinkInternalOrderModal.tsx#L116)                          | `<p style={{'font-style':'italic'}}>`                                                                          | see **F3**                                                                                                                                                                     |

**Reference:** [`OutboundSidePanel.tsx:343-367`](../outbound-shipments/detail/OutboundSidePanel.tsx#L343) — the identical charges block, already `<HStack gap="sm">`.

**Note (out of scope):** the same inline-styled supplier-cell wrapper exists in five sibling lists (outbound, supplier/customer returns, internal orders, prescriptions) and in `src/domain/name/NameSearch.tsx:71`. Binding rules aren't negotiable by prevalence, so inbound is fixed here; the cross-vertical sweep is a separate task — logged as **LIB-3**.

### F2 — Hand-rolled `StatusDot` in the line editor (dim 1) · boutique

[InboundShipmentLineEditModal.tsx:169-188](detail/edit-modal/InboundShipmentLineEditModal.tsx#L169). A coloured dot adorning the Auth-status `Select` options. The registry has **no role** for a select-option status dot: `StatusChip` is dot **+ label on a tinted pill**, which would duplicate the option's own label. The only other implementation is `Dot` in `src/ui-showcase/SelectorsShowcase.tsx:41` — showcase-local, and `src/ui/` must not import from the showcase.

**Fix in scope:** keep it hand-rolled but move the five declarations into the section CSS module (tokens only; `--color-warning` / `--success-main` / `--error-main` are all real tokens and stay). **Flagged as LIB-2** — a candidate library component with two real consumers.

### F3 — Italic instruction line via inline `style` (dim 1, 6)

[LinkInternalOrderModal.tsx:116](list/LinkInternalOrderModal.tsx#L116). `Text` deliberately carries no italic variant. Two verticals already solve this with a section CSS module (`src/sections/settings/Settings.module.css:40`, `src/sections/internal-orders/detail/InternalOrderIndicatorsTab.module.css:50`) — that is the house pattern.

**Fix:** `<Text variant="body" class={styles.instruction}>` with `font-style: italic` in the section CSS module. The copy is load-bearing (spec S2) and stays.

### F4 — Dialog footers ignore `StandardButtons` and D55 (dim 5, dim 1) · 11 dialogs

**Rule:** registry [Modal footer button](../../../spec/ui-standards/components.md#buttons--status) → `CancelButton` / `DialogSaveButton` / `SaveAndNextButton`, "**never** OK/OK & next, never an icon". [D55](../../../spec/DIVERGENCES.md) is binding and "applied app-wide". Reference: [`stocktakes/detail/actions/DeleteLinesAction.tsx`](../stocktakes/detail/actions/DeleteLinesAction.tsx) and [`StocktakeLineEditModal.tsx:1419`](../stocktakes/detail/edit-modal/StocktakeLineEditModal.tsx#L1419).

Every dialog in the vertical hand-rolls `<Button variant="secondary" icon={<XCircleIcon/>}>Cancel</Button>` plus a `t('button.ok')` confirm, most with an icon:

| File                                                                                              | Confirm now                                           | Confirm should be                                                                                           |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [InboundShipmentLineEditModal.tsx:1336](detail/edit-modal/InboundShipmentLineEditModal.tsx#L1336) | Cancel(icon) · **OK & next** · **OK**                 | `CancelButton` · `DialogSaveButton` · `SaveAndNextButton`, in spec S4's order (Cancel · Save · Save & next) |
| [LinkInternalOrderModal.tsx:94](list/LinkInternalOrderModal.tsx#L94)                              | Cancel(icon) · Next                                   | `CancelButton` · `Button` "Next" (a non-standard verb — `Button` is correct)                                |
| [LinkPurchaseOrderModal.tsx:85](list/LinkPurchaseOrderModal.tsx#L85)                              | Cancel(icon) · Add-with-no-lines · Add-with-all-lines | `CancelButton` + the two verb buttons unchanged                                                             |
| [AddFromMasterListModal.tsx:71](detail/modals/AddFromMasterListModal.tsx#L71)                     | Cancel(icon) · **OK**                                 | `CancelButton` · `Button` `button.add` (verb)                                                               |
| [AddFromInternalOrderModal.tsx:110](detail/modals/AddFromInternalOrderModal.tsx#L110)             | Cancel(icon) · Select                                 | `CancelButton` + Select unchanged                                                                           |
| [DefaultDonorModal.tsx:93](detail/modals/DefaultDonorModal.tsx#L93)                               | Cancel(icon) · **OK**                                 | `CancelButton` · `DialogSaveButton` (spec S5: "Cancel · Save")                                              |
| [ChangeLocationAction.tsx:104](detail/actions/ChangeLocationAction.tsx#L104)                      | Cancel(icon) · **OK**                                 | `CancelButton` · `Button` `button.apply` (stocktakes precedent)                                             |
| [ChangeCampaignProgramAction.tsx:116](detail/actions/ChangeCampaignProgramAction.tsx#L116)        | Cancel(icon) · **OK**                                 | `CancelButton` · `Button` `button.apply`                                                                    |
| [DeleteLinesAction.tsx:88](detail/actions/DeleteLinesAction.tsx#L88)                              | Cancel(icon) · OK(icon, `secondary`)                  | `CancelButton` · `Button variant="danger"` `button.delete-lines`                                            |
| [ZeroLineQuantityAction.tsx:80](detail/actions/ZeroLineQuantityAction.tsx#L80)                    | Cancel(icon) · OK(`secondary`)                        | `CancelButton` · `Button variant="primary"` `button.zero-line-quantity`                                     |
| [DeleteInboundShipmentAction.tsx:94](detail/actions/DeleteInboundShipmentAction.tsx#L94)          | Cancel(icon) · OK(icon, `secondary`)                  | `CancelButton` · `Button variant="danger"` `button.delete`                                                  |
| [DuplicateInboundShipmentAction.tsx:117](detail/actions/DuplicateInboundShipmentAction.tsx#L117)  | Cancel(icon) · OK                                     | `CancelButton` · `Button variant="primary"` `button.make-a-copy`                                            |
| [DeleteInboundShipmentsAction.tsx:103](list/actions/DeleteInboundShipmentsAction.tsx#L103)        | Cancel(icon) · OK(icon, `secondary`)                  | `CancelButton` · `Button variant="danger"` `button.delete`                                                  |

Error/success-phase "Close" buttons carrying `CheckIcon` / `XCircleIcon` lose their icons too (same rule).

**Note:** `internal-orders`' delete action has the same drift. D55 is binding regardless — inbound is fixed here, internal-orders is a separate sweep.

### F5 — Destructive confirms aren't `danger` (dim 5)

Registry: `ConfirmDialog` is "an emphasised confirm — `primary`, or **`danger` for a destructive action**"; dimension 5 states "delete = `danger`". Three destructive confirms are `variant="secondary"` ([DeleteLinesAction.tsx:98](detail/actions/DeleteLinesAction.tsx#L98), [DeleteInboundShipmentAction.tsx:104](detail/actions/DeleteInboundShipmentAction.tsx#L104), [DeleteInboundShipmentsAction.tsx:113](list/actions/DeleteInboundShipmentsAction.tsx#L113)), and [DeleteLinesAction.tsx:32](detail/actions/DeleteLinesAction.tsx#L32)'s **trigger** is `secondary` where the stocktakes twin is `danger`. Folded into F4's edits.

### F6 — No column-width presets on any table (dim 3) · 7 tables

**Rule:** the skill's table dimension + [`CELL_TYPES.md`](../../ui/docs/CELL_TYPES.md): a bare helper sets **no `size`**, so the column renders at a wrong default width and can't be dragged sensibly. Widths live per key in [`_globalColumnConfig.ts`](../../ui/elements/table/_globalColumnConfig.ts). Reference: `names`, `locations`, `items` all migrated ([their reports](../names/ui-migration-report.md)); `stocktakes` deferred this as a tracked rollout, so the three migrated verticals are the house pattern.

| Table                      | Columns → `getCellDefinition(key)`                                                                                                                                                                                                                                | Columns with no `CELL_DEF` key → explicit helper + call-site `size`                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **L1** list                | `otherPartyName` (keep `headerPosition:'primary'`, add `wrapLines:2`), `invoiceNumber`, `createdDatetime`, `deliveredDatetime`, `comment`, `theirReference`, `total`                                                                                              | `status` ≈ `7.5`/`9.375` (Status is a page-rendered cell type), `linkedOrder` ≈ `6`                                                                                                                       |
| **D1** detail lines        | `itemCode`, `itemName`, `batch`, `expiryDate`, `location`, `unitName`, `packSize`, `dosesPerUnit`, `numberOfPacks`, `difference`, `unitQuantity`, `doses`, `costPricePerPack`, `sellPricePerPack`, `total`, `manufacturer`, `manufactureDate`, `comment` (see F7) | `poLine` ≈ `5`, `vvmStatus` (has a key — `shortText`), `authStatus` ≈ `7`, `donor` ≈ `10`, `campaignProgram` ≈ `10`                                                                                       |
| **D5** Financial           | `itemName`, `numberOfPacks`, `packSize`, `unit`                                                                                                                                                                                                                   | `poLine` ≈ `5`; the six `moneyColumn`s keep `getNumberCell()` + the mixed-currency money cell (a shared currency cell is pinned to one code) and gain `size: remToPx(9)` for their `Label (CODE)` headers |
| **D7** Delivery            | `code`, `name`, `remaining`, `poQuantity`                                                                                                                                                                                                                         | `previous` ≈ `9`, `thisDelivery` ≈ `8`, `inTransit` ≈ `7`                                                                                                                                                 |
| **D9** Log                 | `datetime` (via `date`), `time`, `user`                                                                                                                                                                                                                           | `event` ≈ `12`, `details` ≈ `20`                                                                                                                                                                          |
| **L4** link-internal-order | `createdDatetime`, `theirReference`, `comment`                                                                                                                                                                                                                    | `requisitionNumber` ≈ `3.5`, `enteredBy` (via `user`), `program` ≈ `10`                                                                                                                                   |
| **L5** link-purchase-order | `supplierName`, `reference`, `comment`                                                                                                                                                                                                                            | `number` ≈ `3.5`                                                                                                                                                                                          |

**D10** (line editor) is card-only (`viewMode: 'card'`, no toggle), so column widths never render — **BENIGN**, left alone.

### F7 — The detail line table's Comment column is wrong (dim 3, dim 11)

Spec S3's line table puts **Comment** at column **1**, hidden by default, using the shared comment cell (icon + popover). The implementation renders it **last**, headed `label.note`, as a plain text cell: [InboundShipmentDetailView.tsx:766](detail/InboundShipmentDetailView.tsx#L766).

**Fix:** move to first, `header: () => t('label.comment')`, `...getCellDefinition('comment')`, hidden in the compact default (F8). This is spec-owned content — the spec wins.

### F8 — Detail line table has no compact-band column defaults (dim 3, dim 11)

[InboundShipmentDetailView.tsx:159-171](detail/InboundShipmentDetailView.tsx#L159) hides only `manufactureDate`, `manufacturer`, `note`, `sellPricePerPack`, and has no `compact` block at all — where the list table ([InboundShipmentsList.tsx:104](list/InboundShipmentsList.tsx#L104)) has both bands. Spec S3's line table marks 15 columns "hidden by default (narrow)": Comment, VVM status, Location, Unit name, Doses per unit, Difference, Unit quantity, Doses, Cost per unit, Price per pack, Total, Donor, Manufacturer, Manufacture date, Campaign/program.

**Fix:** a `compact` band mirroring that set (plus `viewMode: 'card'` like the list), and a `base` band matching it. Spec S3 also says the **Code** column is "pinned left" — expressible as `columnPinning: { left: ['itemCode'] }` in the same default config.

### F9 — Colour-tag cell ignores the registry's `variant` and read-only dot (dim 1, dim 3)

[InboundShipmentsList.tsx:240-245](list/InboundShipmentsList.tsx#L240).

- Registry [Colour tag](../../../spec/ui-standards/components.md#buttons--status): "`variant` = **`row` (list cell)** / `field`". Inbound omits `variant`, so the cell gets the field treatment. Outbound and prescriptions both pass `variant="row"`.
- Registry: "`ColourTagDot` is the **read-only dot** (render it when tagging isn't allowed, e.g. a non-editable row)". Inbound always renders the editable picker, even on a Verified shipment. Outbound (`isEditable(row.status)`) and supplier-returns (`!isReturnDisabled(row)`) both gate it — two siblings agree, so this is settled.
- The `<span onClick={e => e.stopPropagation()}>` wrapper is **redundant**: `ColourTagPicker` already wraps itself in exactly that ([ColourTag.tsx:50](../../ui/elements/selectors/ColourTag.tsx#L50)). Delete it — that also removes a click handler from a non-interactive element (dim 9).

### F10 — Disabled bulk actions use hand-rolled `<span title>` wrappers (dim 1, dim 9)

[InboundShipmentsList.tsx:428-461](list/InboundShipmentsList.tsx#L428) wraps `DeleteInboundShipmentsAction` and `DuplicateInboundShipmentAction` in `<span title={reason}>` to carry the disabled reason.

The **visible-disabled** treatment itself is correct and deliberate — [`controls.md` § blocked affordances](../../../spec/ui-standards/controls.md) "actionable block", and `internal-orders`' delete action explicitly cites inbound as the visible-disabled case. It is the _wrapper_ that's bespoke: `Button` spreads rest props, so the house pattern puts `disabled` + `title` **on the button** — [`outbound-shipments/list/actions/DuplicateShipmentAction.tsx:98-99`](../outbound-shipments/list/actions/DuplicateShipmentAction.tsx#L98).

**Fix:** add a `title?: string` prop to both action components and forward it to their trigger `Button`; drop the wrapper spans. (Caveat that motivates **LIB-5**: a native `title` on a `disabled` button doesn't render a tooltip in Chromium, so the reason is weakly perceivable either way — that is a library-level gap, not something to solve by keeping the wrapper.)

### F11 — The toolbar's PO-number link is a bare `<A>` (dim 1)

[InboundShipmentDetailToolbar.tsx:164-168](detail/InboundShipmentDetailToolbar.tsx#L164) renders `<A href=…>#{po().number}</A>`. Registry [`RecordLink`](../../../spec/ui-standards/components.md#typography): "A hand-rolled toned `<A>` for a related record is a bespoke look-alike (C3)". The vertical's **own side panel** does it correctly 70 lines away ([InboundShipmentSidePanel.tsx:235](detail/InboundShipmentSidePanel.tsx#L235)): `<RecordLink kind="po">{poLabel(po().number)}</RecordLink>`.

**Fix:** `RecordLink kind="po"` + `poLabel()`, matching the side panel and the list cell.

### F12 — Errorable code cell uses an inline `style` (dim 1, 6)

[InboundShipmentDetailView.tsx:538-551](detail/InboundShipmentDetailView.tsx#L538) tones a transferred line's item code with `style={{color:'var(--error-main)'}}`. The comment cites "the linked-order cell's inline-style precedent in this table" — that cell now uses `RecordLink`, so the precedent is gone. `CELL_TYPES.md:28` shows an `ErrorableCode` in an illustrative snippet, but **no such component exists**.

**Fix:** `{ ...getCellDefinition('itemCode'), cell: … }` with a token-only class from the section CSS module (reach-for order step 4). Flagged as **LIB-4**.

### F13 — Side-panel edit affordances are labelled `Button`s, not `IconButton`s (dim 5)

Three sites — donor ([:183](detail/InboundShipmentSidePanel.tsx#L183)), service charges ([:309](detail/InboundShipmentSidePanel.tsx#L309)), currency ([:380](detail/InboundShipmentSidePanel.tsx#L380)) — render `<Button variant="secondary" icon={<EditIcon/>}>Edit</Button>` inside a dense `FieldRow`. The sibling with the **identical** charges block and the **same three testids** uses `<IconButton bordered size="small" icon={<EditIcon/>} label={…} />`: [`OutboundSidePanel.tsx:286`, `:392`](../outbound-shipments/detail/OutboundSidePanel.tsx#L286).

**Fix:** `IconButton bordered size="small"` with the accessible `label`, keeping the testids.

### F14 — Side-panel values are bare `<span>` / `<strong>` (dim 5)

Every read-only value in the side panel is a bare `<span>{money(…)}</span>`, and the grand total is a raw `<strong>` ([:398](detail/InboundShipmentSidePanel.tsx#L398)). Outbound uses `<Text variant="body">` for the same values. `Text` is the registry's shared type primitive.

**Fix:** `Text variant="body"` for the values; the grand total's emphasis rides its label (see F15's decision) rather than a raw `<strong>`.

### F15 — Missing side-panel affordances the spec names (dim 5, dim 11)

Spec S3 § side panel:

- "**Edited by** (the last editing user; where that user's email is known, an **info affordance reveals it**)" — [:195](detail/InboundShipmentSidePanel.tsx#L195) renders the username only. Fix: `InfoTooltip` beside it when the email is known.
- "The internal-order entry … with a **hover tooltip** naming when and by whom it was created" — [:244](detail/InboundShipmentSidePanel.tsx#L244) has no tooltip. Sibling precedent: `internal-orders/detail/InternalOrderSidePanel.tsx:154` (`shipmentTooltip`).

Both are spec-owned content → the spec wins, fix the implementation. Both need the email / created-by fields on the fragment — **if codegen or the fragment doesn't carry them, this drops to a flagged gap rather than a fix** (noted in the end report either way).

### F16 — Test hooks (dim 10)

Contract: [`e2e/TESTIDS.md`](../../../e2e/TESTIDS.md), inbound block at lines 232-254.

| Site                                                                           | Issue                                                                                                                                                                                                                    | Fix                                                                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| [InboundShipmentDetailView.tsx:999](detail/InboundShipmentDetailView.tsx#L999) | the empty-state button hand-stamps `add-item-button`, **colliding** with the split button's generated `add-item-button-main`/`-dropdown` prefix                                                                          | `nothing-here-create-button` (TESTIDS:129, as the list already does)                 |
| [InboundShipmentDetailView.tsx:889](detail/InboundShipmentDetailView.tsx#L889) | bulk-action `ContentFooter` has no `testId`                                                                                                                                                                              | `testId="actions-footer"` (shared id, TESTIDS:36)                                    |
| [InboundShipmentDetailView.tsx:890](detail/InboundShipmentDetailView.tsx#L890) | the "N Selected" `<strong>` has no testid                                                                                                                                                                                | `data-testid="selected-rows-count"` (TESTIDS:38); reference `StocktakesList.tsx:317` |
| 9 dialogs                                                                      | Cancel has no `dialog-button-cancel` id (AddFromMasterList, DefaultDonor, ChangeLocation, ChangeCampaignProgram, DeleteLines, ZeroLineQuantity, DeleteInboundShipment, DuplicateInboundShipment, DeleteInboundShipments) | pass `data-testid="dialog-button-cancel"` to the `CancelButton` from F4              |

## Why four dimensions are clean

- **Dim 2 (screen composition).** Both screens use the `Page` frame with `header` / `sidePanelContent` / `contentFooter` slots; the detail header is a real `HeaderToolbar` with the kind banner in its `alert` slot (a `compact` `Alert`, exactly as the slot intends); `TabList` is the `Header`'s last child so it claims the bottom edge; one `<h1>` via `Breadcrumb`; the whole vertical owns **no CSS module** today. Matches `#/showcase/header` and `#/showcase/page-layout`.
- **Dim 4 (inputs).** `DateField` (never `TextField type="date"`), `NumberField` / `CurrencyField` with `decimalLimit`, `TextArea` for the reference, `Select` for fixed sets, `AsyncCombobox`-backed domain lookups (`NameSearch`, `ItemSearch`, `LocationVolumeSelect`, `VvmStatusSelect`, `MasterListSelect`, `CampaignOrProgramSelect`), `RadioGroup` for the apply-to-lines choice, `FilterBar` typed chips with no separate always-on search box. Every role resolves to its registry component.
- **Dim 7 (reactivity).** The detail view's `info` / `lines` reads are `.state`-gated (`'ready' || 'refreshing'`) — _stricter_ than the reference vertical, and correct because a line save refetches while the editor dialog is open. `customFieldDefinitions(…).noSuspense()`, the sequential (non-`createResource`) line load in the editor, the keyed `<Show>` per open, and the serialised-variables resource keys are all right. `data.latest` on the list and `locationsData.latest` match `StocktakeDetailView.tsx:258/318` exactly. Re-checked with the `check-reactivity` skill after the fixes.
- **Dim 8 (type safety).** Filters flow as the generated `InvoiceFilterInput` (`listFilters.tsx` adds only the client-only `kind`, stripped before the query); the exhaustive `constructFilters` `Record` makes a new schema filter a compile error; every `as` is a documented narrowing at a boundary. `DeliveryRow` is a genuine aggregation, not a parallel copy of a GraphQL type.

## What was done

Applied one screen at a time, in the order the audit set out. Each fix climbed the reach-for order; nothing was left as an inline `style` outside the deferred side panel.

| Finding | Outcome |
| --- | --- |
| **F1** flex + inline `style` | List supplier cell → `HStack gap="sm"`; log-panel change list → `Stack gap="sm"` (its `0.25rem` literal gone). Kind icons and the errorable code moved to scoped CSS modules — icons paint with `currentColor`, so a token-only `color` rule replaces the inline one. **The four side-panel sites stay open** (deferred). |
| **F2** hand-rolled `StatusDot` | Kept hand-rolled (no registry role fits — `StatusChip` would duplicate the option's own label), but its five inline declarations became a scoped CSS module: `.statusDot` plus one class per state. **A colour passed as a custom property was rejected** — that still needs an inline `style`, which is what this replaces. Still flagged as **LIB-2**. |
| **F3** italic instruction | `Text variant="body"` + a scoped `.instruction` class, the answer two other verticals already reached. |
| **F4** dialog footers (11) | `CancelButton` everywhere, with the shared `dialog-button-cancel` id; icons dropped (D55); confirms relabelled to verbs — `Delete`, `Delete lines`, `Apply` ×2, `Add`, `Make a copy`, `Zero line quantity`. The line editor took the full standard three, in spec S4's order: **Cancel · Save · Save & next** (was Cancel · OK & next · OK). Two `OK`s survive **deliberately** — the duplicate's skipped-lines notice and the bulk delete's success count are acknowledgements, not saves, which is exactly the case D55 keeps `OkButton` for; both now use `OkButton` rather than a raw `Button`. |
| **F5** destructive tone | Three confirms → `variant="danger"`; `DeleteLinesAction`'s trigger too, matching its stocktakes twin. |
| **F6** column widths (7 tables) | Every column now carries a width: `getCellDefinition('<key>')` where a `CELL_DEF` key exists, an explicit helper + call-site `size: remToPx(…)` where none does (every one verified to carry it). The line editor's table is **card-only**, so its widths never render — left alone, documented as benign. |
| **F7** Comment column | Moved to first, headed `label.comment`, rendered by the comment preset. |
| **F8** column defaults | A `compact` band mirroring spec S3's 15 narrow-hidden columns, `viewMode: 'card'`, and `columnPinning: { left: ['itemCode'] }` in both bands for the spec's pinned Code column. |
| **F9** colour-tag cell | `variant="row"` added; `ColourTagDot` on a non-editable row (the outbound + supplier-returns gate); the redundant `stopPropagation` wrapper deleted — `ColourTagPicker` already does it, so this also removed a click handler from a non-interactive element. |
| **F10** disabled-reason wrappers | Both wrapper `<span>`s gone; the two action components take a forwarded `title` that lands on their own trigger `Button`, per the outbound precedent. |
| **F11** bare `<A>` | `RecordLink kind="po"` + `poLabel()`, matching the side panel and list for the same record. |
| **F12** errorable code | `getCellDefinition('itemCode')` + a scoped class. |
| **F16** test hooks | `nothing-here-create-button` replaces the colliding `add-item-button`; `actions-footer` and `selected-rows-count` added; 9 dialogs gained `dialog-button-cancel`. |

### One bug the fixes introduced and the review caught

Keying the new column-visibility defaults on `comment` while the column was still declared `c: { key: 'note' }` would have silently missed: `key` derives the TanStack id, so the defaults addressed a column id that didn't exist — the Comment column would have shown by default (against the spec) and the old `note: false` default would have been lost. Fixed by giving the column an explicit `id: 'comment'`, which also aligns it with the list's id for the same role and the preset key. The detail table's column ids aren't in the e2e contract, so the rename is safe.

### Reactivity

Re-checked over the finished diff via the `check-reactivity` skill: **no reactivity findings.** The changes are composition-only — no resource read, effect, store write or `<Show keyed>` was touched. Two things confirmed benign: the `title` signal read stays reactive across the component boundary (`Button` spreads rest props, and Solid's prop getters preserve it), and the list's supplier cell reads plain row fields inside the cell's own tracking scope exactly as before.

## Spec edits — signed off and made

Pure-UI drift in [`spec/inbound-shipments/ui-surface.md`](../../../spec/inbound-shipments/ui-surface.md); the standards + registry win, so the **spec** moved. Both landed on line 187, approved by the spec owner (2026-07-30):

1. ✅ **modal-level tabs → page-level tabs.** These are the page's own tabs in the app-bar header; `modal-level tabs` is the registry's dialog-hosted role.
2. ✅ **Custom fields added to the tab list.** The bullet omitted it where line 106's Tabs section lists it and the implementation renders it.

Neither changes behaviour; both are the spec contradicting itself or naming the wrong role. No `DIVERGENCES.md` entry needed (no delta from the reference app).

## Out of scope — spec-owned behaviour gaps (not migration work)

Found by the dimension-11 durability check; the **spec wins**, so these are implementation gaps, but they are behaviour/content, and migration "changes UI composition only":

- **Scan** — spec S3 lists a barcode-assisted line-entry page action, in the header cluster between Add item and Report/print. Not implemented.
- **Upload document** — spec S3 (and TESTIDS:241) list it as the Add-item split button's fourth option. Not offered.
- **Line table columns 17/18** — spec says **Cost per unit** (weighted-average, summed) and **Price per pack**; the implementation shows **Pack cost price** / **Pack sell price**. A derivation difference, not a composition one.
- **Line-table row grouping** — spec S3: "a manual/external shipment groups rows by item code; a PO-linked shipment groups by PO line number", and the Financial tab groups by PO line. Blocked on **LIB-1**.

## Library findings surfaced

One was fixed on the spec owner's instruction (LIB-7); the rest are flagged, not fixed — a migration doesn't change shared library code unasked.

| #         | Gap                                                                                                                                                                                                                                                                             | Disposition                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **LIB-1** | `DataTable` has **no table-view row grouping** — `cardGroups` is card-view only, there is no `groupBy` prop, and no group-by control in the toolbar. Spec S3 requires grouping on the detail line table and the Financial tab; both currently approximate it by sort adjacency. | File an issue against the shared `DataTable` (behaviour gap). Blocks the spec's grouping requirement app-wide, not just inbound. |
| **LIB-2** | No library component for a **coloured status dot as a select-option adornment**. Two consumers already: the inbound line editor's Auth status, and `SelectorsShowcase`'s local `Dot` over `INVOICE_STATUSES`.                                                                   | [`ADDING_A_COMPONENT.md`](../../ui/docs/ADDING_A_COMPONENT.md) task.                                                             |
| **LIB-3** | No way to **tone an icon semantically**. The party-kind icon (store = primary, external = secondary) is inline-styled in `src/domain/name/NameSearch.tsx:75` and in six section lists. Candidates: a `tone` prop on icons, or a shared `PartyKindIcon`.                         | `ADDING_A_COMPONENT.md` task; would also retire the section CSS module F1 adds.                                                  |
| **LIB-4** | No **errorable code cell** fragment, though `CELL_TYPES.md:28` documents `<ErrorableCode …/>` as if one existed.                                                                                                                                                                | Either build the fragment or correct the doc's example — a library/doc task.                                                     |
| **LIB-5** | A **disabled `Button` can't carry its reason accessibly**: a native `title` doesn't render on a disabled element in Chromium, so `controls.md`'s "visible-disabled, reason perceivable in place" (D39) has no working mechanism. Affects every vertical's bulk actions.         | File an issue — a `disabledReason` prop (tooltip on a wrapper the component owns, plus `aria-describedby`) is the likely shape.  |
| **LIB-6** | `Text` has **no italic variant**; three verticals now carry a section CSS module solely for `font-style: italic` on an instruction line.                                                                                                                                        | Low priority — note only.                                                                                                        |
| **LIB-7** | `--color-divider` was **nearly invisible in dark mode** — 1.16:1 against `--bg-white`, weaker than the light theme's own divider manages (1.20:1). Light's "divider is the weakest line" relationship had been mirrored literally into dark, which put it a shade closer to the dark *background* instead of further from it. Affected all 33 uses of the app-wide hairline (table row rules, side-panel section splits, accordion and form-section rules, menu-bar and split-button separators), not just this vertical. | ✅ **Fixed on instruction** (Carl, 2026-07-30): dark `--color-divider` → `#33333f`, the value `--color-border-value` / `--header-border` already carry — one hairline colour, as in light. 1.28:1, matching light's border-value (1.27:1). Verified on the dark list and side panel; theme contract green. |

## Decisions

**D1 — Charges sub-group headings: withdrawn from this migration.** Three treatments were built and measured on the real panel (`FormSection headingLevel="h3"`; the same with the gap tightened to the panel's `--space-2`; and a scoped `<h3>` in the flat `FieldRow` run). The spec owner rejected the result and reverted it: the side panel's composition is being settled by a separate **design spec**, so the question moves there rather than being answered by this migration.

Worth carrying into that design spec, since it cost a build to learn:

- `FormSection`'s `gap: var(--space-4)` is a **form's** rhythm. In a panel tuned to `--space-2` the Charges section grew until **Grand total was clipped** by the pinned Actions section.
- Sibling `FormSection`s carry **no gap between them**, so each heading hugged the row above rather than opening a block — worse separation than the empty-`FieldRow` version it replaced.
- `FormSection`'s `title` is a plain **string**, so it cannot host a block's edit affordance — and two of the three blocks (service charges, foreign currency) have one. Any treatment that uses `FormSection` must demote that action to its own row.
- Keeping the rows in **one flat grid run** is what holds every label column in the section aligned (the constraint [`StocktakeSidePanel`](../stocktakes/detail/StocktakeSidePanel.tsx#L49) records). Splitting blocks into separate containers gives each its own `minmax(6rem, max-content)` column, which can drift.
- Independent of the heading question, the labelled `Edit` **buttons dominate the narrow panel**; as `IconButton bordered size="small"` (the [outbound twin's](../outbound-shipments/detail/OutboundSidePanel.tsx#L286) treatment, same testids) the whole Charges block fits without scrolling. That is **F13**, still open.

## Boutique / uncovered elements

Everything that could **not** be covered by a library component, each with its disposition:

- **The Auth-status option dot** (line editor) — hand-rolled over a scoped CSS module. **(a) A candidate new library component**: two real consumers already (this, and `SelectorsShowcase`'s local `Dot` over `INVOICE_STATUSES`). `StatusChip` is not it — a dot *plus* a label on a tinted pill would duplicate the option's own text. → **LIB-2**.
- **The supplier kind icon's tone** (list) — a scoped CSS module class. **(a) A candidate new library component or prop**: a `tone` on icons, or a shared party-kind icon. `src/domain/name/NameSearch.tsx` needs the identical thing for its option rows, and six section lists inline-style it today. → **LIB-3**.
- **The errorable item code** (detail line table) — a scoped CSS module class. **(a) A candidate**: `CELL_TYPES.md` already documents an `ErrorableCode` that doesn't exist. → **LIB-4**.
- **The italic instruction line** (link-internal-order modal) — a scoped CSS module class. **(c) A deliberate, documented exception**: `Text` carries size/weight only and deliberately has no italic variant; three verticals now solve it the same way. → **LIB-6**.
- **The mixed-currency money columns** (Financial tab) — `getNumberCell()` plus the tab's own `money()` formatter, not the currency preset. **(c) A deliberate exception**: the currency preset pins one currency code, and this table deliberately shows PO-currency and local columns side by side, each naming its currency in the header.
- **Row grouping** (detail line table, Financial tab) — cannot be covered at all: `DataTable` has no table-view grouping. **(b) Blocked on a library gap** → **LIB-1**; the tabs approximate the spec's grouping by sort adjacency meanwhile.
- **The side panel's Charges sub-grouping** — withdrawn to a design spec (see [Decisions](#decisions)).

## Your visual pass — the part this migration can't sign off

Static checks pass, but they can't catch "compiles clean but looks wrong". Both screens, in **light and dark**:

| Screen | Route | Compare against |
| --- | --- | --- |
| List | `/<storeId>/replenishment/inbound-shipment` | `#/showcase/table` · `StocktakesList` |
| Detail (+ tabs, line editor, modals) | `/<storeId>/replenishment/inbound-shipment/<id>` | `#/showcase/header`, `#/showcase/page-layout`, `#/showcase/table` · `StocktakeDetailView` |

Data notes from driving it: the **Default / Open mSupply** store (`62A64…`) holds the 33 shipments — *Kopu Clinic* is empty. Shipment **#1** (`019e8ada-…`) is the only one with real charges (a service line + 5% tax) and is **Verified**, so it also shows every read-only/disabled state; `019faaff-…` is an editable one.

Worth looking hardest at, since these are what changed:

1. **Column widths and resizing** — every column moved to a preset or an explicit width. This is the change most likely to look wrong: check nothing is comically narrow or truncating, and that each column still drags.
2. **The detail line table's new defaults** — Comment now first and hidden; Code pinned inline-start; the compact band hides 15 columns and defaults to cards. Check the pinned column behaves as the wide set scrolls, and that the card view is sane on a narrow viewport.
3. **The list's supplier cell** — the swatch is now `variant="row"` and becomes a plain dot on a non-New row. Check the dot and the picker sit the same, and the kind icon's tone survived the move off inline styles in **both themes**.
4. **Dialog footers** — 11 of them changed label, tone and icon. Check the destructive ones read as destructive and that no footer button looks bare now its icon is gone.
5. **Empty states** on the list and the Details tab.
