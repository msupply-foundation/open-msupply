# Internal orders — UI migration audit report

**Status: MIGRATION COMPLETE (two decisions still open).** All approved fixes applied; spec drift reconciled (SE1–SE7 + the new D93); `pnpm check` green; `pnpm test` green (135 files, 1315 tests); the reactivity review of the working diff came back clean. **The visual pass is yours** — see [_Your visual pass_](#your-visual-pass-required--the-skill-cannot-sign-this-off). Decisions 1–2 remain open per your ruling; the code parks their surfaces at the pre-migration placement.

## Outcome (fixes applied)

| Finding | Resolution |
| --- | --- |
| A1–A7 · dialog-footer drift (7 dialogs) | `CancelButton` everywhere a footer Cancel was hand-rolled; delete confirms → icon-less `danger` (list bulk delete, order delete, delete-lines); non-destructive confirms → `OkButton` (use-suggested, send); every footer icon dropped (incl. the create modal's `PlusCircleIcon`); trigger buttons in page chrome keep their icons. |
| A8 · footer close | Hand-rolled Close → `CloseButton` (regains the phone icon-collapse). |
| B1 · detail header | Field cluster recomposed as `HeaderToolbar` children — label-above `size="small"` controls, whole-cluster `FormRowItem` weights (lookups 1.5/1, MOS selects 0.7 capped 12rem, switch pinned at weight 0), floors summing to the unweighted row's. `FieldRow` wrappers, the `aria-hidden` spacer, `FormColumns`, and `InternalOrderToolbar.module.css` all deleted. Notices + ancillary banner kept on their own full-width row beneath (decisions 1–2 open). |
| B2 · ancillary banner | Flex classes → `HStack`/`Stack` (`justify="between"` rows); module.css reduced to the popover measure cap + plan-title weight. |
| C1 · line-table cells | Inline-flex spans → `HStack gap="sm"` (requested cell `justify="end"` to keep the number at the cell's inline-end); inline icon colours → scoped `.errorMarker` class (new `InternalOrderDetailView.module.css`). |
| C2 · list name cell | Inline-flex span → `HStack gap="sm"`; `ColourTagPicker` gains `variant="row"`. |
| C3 · order-type option row | Inline styles → `HStack gap="sm"` + scoped `.emergencyMarker` class (new `CreateInternalOrderModal.module.css`). |
| D1/D3 · side-panel links | Hand-rolled `<A class={styles.link}>` → `RecordLink` (shipment neutral — the orange tone was wrong; requisition `kind="io"`); native `title` annotation → `Popover openOnHover` on the row label (the outbound pattern); `InternalOrderSidePanel.module.css` deleted. |
| D2 · colour gate | `ColourTagPicker variant="field"` behind `<Show when={editable}>` with a `ColourTagDot` fallback — the 4-sibling pattern; fixes the spec-anchored gating bug (`ui-surface.md` S5). |
| D4 · test hook | `data-testid="grand-total-field"` on the pricing grand total. |
| E1 · restricted rows (AC-L7) | `rowState={row => (isRowEditable(row) ? undefined : 'disabled')}` on the list table — the 5-sibling pattern. |
| E2 · excess marker a11y | `aria-label` now `messages.requested-exceeds-suggested` (existing key), not the column name. |
| E3 · on-hold marker | On-hold supplier options labelled `… (On hold)` via existing `label.on-hold` — dimming no longer the only cue. |
| E4 · type cast | `editorLine()` narrowed once via `editorInitialLine()`; the `as` dropped. |

### Spec edits applied

- **SE1** Number column header documented as language-neutral `#`. **SE2** dropped the stale/px-leaking "fixed 700×700". **SE3** Export → CSV/Excel split. **SE4** related-document links now name the related-record-link role (shipment neutral / requisition kind). **SE5** condensed-tablet omission claim replaced with the D93-linked keep-filters-and-Export statement. **SE6** deleted the unreachable master-list "informational toast" sentence (Toast is a ⛔-reserved role; the Add control is disabled off Draft). **SE7** registry "Modal-level tabs" note updated — now exercised by the internal-orders + requisitions create modals.
- **D93** added to `spec/DIVERGENCES.md`: this app keeps the list's filters + Export at every width where the reference app's condensed tablet layout omits them (rationale per D7/D33).

### Your visual pass (required — the skill cannot sign this off)

Open each screen in **light and dark** against its showcase page + reference:

- **Detail header** (`#/showcase/header`) — the biggest visible change: label-above fields in `HeaderToolbar`, weighted shares, wrap behaviour on narrow widths; **check the hide-over-min switch's vertical alignment** (no house precedent for a switch in a header cluster — it top-aligns beside taller labelled fields; flag if it reads wrong). Notices/ancillary banner still ride their own row beneath.
- **Ancillary banner** — message + Details/Add cluster spacing (`HStack justify="between"`, gaps changed from space-3 to space-4); the plan popover rows.
- **Line table** — the excess/reason warning markers and item-name tooltip after the `HStack` change (gap grew from space-1 to space-2); the requested cell's number should still sit at the cell's right edge.
- **List** — restricted (Sent/Finalised/disabled-supplier) rows now dimmed with the `disabled` tint; the colour-tag + name cell.
- **All 7 dialog footers** — icon-less; delete confirms red; Cancel buttons carry the Esc hint badge.
- **Side panel** (`#/showcase/side-panel`) — related-document rows: label is now a hover/focus popover trigger, number a `RecordLink` (shipment neutral-toned — was orange); colour row shows a dot on a read-only order.
- **Create modal** — footer Create icon-less; emergency order-type marker; on-hold suppliers show "(On hold)".

## Scope & method

- **Scope:** the whole `internal-orders` vertical — all ~20 screens/pieces (list + filters + list actions + create modal + stocktake-warning dialog + detail view + toolbar + ancillary banner + status footer + documents tab + side panel + line columns + plugin views + detail actions + line-edit modal), each judged against all 11 dimensions of `src/ui/docs/MIGRATING_A_VERTICAL.md`.
- **Method:** seven parallel read-only audits (list, create modal, detail core, line table + actions, side panel vs the binding `SIDE_PANEL.md` checklist, line-edit modal, spec consistency), each diffing against the rules, the showcase source, the stocktakes reference, and the sibling verticals. Every candidate was verified against the code and the component source before becoming a finding. Reactivity was audited statically against `kdd/solid-reactivity-pitfalls`; the `check-reactivity` skill runs again on the diff after the fixes.

## Headline

The vertical is **in good shape structurally** — table wiring is exemplary (every column uses `getCellDefinition` width presets; `createTableConfig`, `rowTone`, selection, sort, filters-in-table-toolbar all correct), the line-edit modal is a **zero-finding** faithful copy of the requisitions house pattern with textbook resource read-gating, and the plugin seams (columns, info panel) follow the sanctioned SDK contract exactly. The real work is **three clusters**:

1. **Dialog-footer drift (D55)** — 7 dialogs hand-roll icon-bearing footer buttons; destructive confirms render `secondary` instead of `danger`; the status-footer Close is a hand-rolled `CloseButton` look-alike. _Largest cluster; mechanical._
2. **Detail header composition** — the header field cluster is hand-rolled (`Toolbar` + `FormColumns`/`FieldRow` + a CSS module + an `aria-hidden` spacer) where **7 sibling verticals** use `HeaderToolbar` with label-above fields. _Structural; carries the two decisions below._
3. **Inline-style flex cells** — the icon-annotated table cells, the list's colour-tag+name cell, the create modal's option row, and the ancillary banner's CSS flex rows all hand-roll layout that `HStack`/`Stack` owns.

Plus a small side-panel cluster (hand-rolled `<A>` where `RecordLink` is registered; an **ungated colour picker** — a spec-anchored gating bug), one list-level spec-anchored gap (restricted rows not visually distinguished, AC-L7), and six spec edits.

Notably, **requisitions shares most of these defects verbatim** (toolbar hand-roll, side-panel links, inline cells, option row, colour-variant omissions). That vertical is out of scope here; a follow-up requisitions migration would be cheap after this one.

## Coverage table (screens × 11 dimensions)

Legend: ✅ clean · _n_ = REAL findings (ids below) · ⚠ = decision needed · ° = benign/notable (see notes) · — = N/A.

Dimensions: **1** C3/registry · **2** composition · **3** tables · **4** inputs · **5** forms/side-panel/buttons · **6** styling · **7** reactivity · **8** types · **9** a11y · **10** test hooks · **11** spec.

| Screen / file                           | 1     | 2     | 3   | 4   | 5     | 6     | 7   | 8   | 9   | 10  | 11    |
| --------------------------------------- | ----- | ----- | --- | --- | ----- | ----- | --- | --- | --- | --- | ----- |
| index.tsx                               | ✅    | ✅    | —   | —   | —     | —     | ✅  | ✅  | —   | —   | ✅    |
| list/InternalOrdersList.tsx             | 2     | ✅°   | ✅° | ✅  | —     | 1     | ✅° | ✅° | ✅  | ✅  | 2     |
| list/listFilters.tsx                    | ✅    | —     | ✅  | ✅  | —     | ✅    | ✅  | ✅  | ✅  | ✅° | ✅    |
| list/actions/DeleteInternalOrders…      | 1     | —     | —   | ✅  | 3     | ✅    | ✅  | ✅  | ✅  | ✅  | ✅    |
| list/actions/ExportInternalOrders…      | ✅    | —     | —   | —   | —     | ✅    | ✅  | ✅  | —   | —   | 1     |
| list/create/CreateInternalOrderModal    | 1     | ✅    | —   | 1   | ✅    | 1     | ✅° | ✅° | 1   | ✅° | 1     |
| list/create/StocktakeWarningDialog      | 1     | ✅    | —   | ✅° | —     | ✅    | —   | ✅  | ✅  | ✅  | ✅    |
| detail/InternalOrderDetailView.tsx      | 2     | 1     | ✅° | —   | —     | 2     | ✅° | °   | 1   | ✅  | ✅°   |
| detail/InternalOrderToolbar (+css)      | 1     | 1     | —   | ✅  | 1     | 1     | ✅  | °   | ✅  | ✅  | ⚠     |
| detail/InternalOrderAncillaryBanner (+css) | 1  | °⚠    | —   | ✅  | —     | 1     | ✅  | ✅  | ✅  | ✅  | ✅    |
| detail/InternalOrderStatusFooter.tsx    | 2     | ✅    | —   | 1   | ✅    | ✅    | ✅  | ✅  | ✅  | ✅  | ✅°   |
| detail/InternalOrderDocumentsTab.tsx    | ✅    | ✅    | —   | ✅  | —     | ✅    | ✅  | °   | ✅  | ✅  | ✅    |
| detail/InternalOrderSidePanel (+css)    | 1     | —     | —   | 1   | 1     | 1     | ✅  | ✅° | 1   | 1   | 2     |
| detail/lineColumns.tsx                  | °     | —     | °   | —   | —     | ✅    | ✅  | ✅  | ✅  | —   | ✅    |
| detail/pluginViews.ts                   | —     | —     | —   | —   | —     | —     | ✅  | °   | —   | —   | ✅    |
| detail/actions/DeleteInternalOrder…     | 1     | —     | —   | —   | 1     | ✅    | ✅  | ✅  | ✅  | °   | ✅    |
| detail/actions/DeleteLines…             | 1     | —     | —   | —   | 2     | ✅    | ✅  | ✅  | ✅  | ✅  | ✅    |
| detail/actions/ExportPrint…             | ✅    | —     | —   | —   | ✅    | ✅    | ✅  | ✅  | ✅  | ✅  | ✅    |
| detail/actions/UseSuggestedQuantities…  | 1     | —     | —   | —   | 2     | ✅    | ✅  | ✅  | ✅  | ✅  | ✅    |
| edit-modal/InternalOrderLineEditModal (+css/ts) | ✅° | — | — | ✅° | ✅°  | ✅°   | ✅° | ✅° | ✅  | ✅  | ✅    |

The side-panel row also **passes every item of the binding `SIDE_PANEL.md` sign-off checklist** — its findings come from the registry / sibling precedent, not the panel contract.

## Findings — code fixes (grouped by cluster)

### Cluster A — dialog-footer drift (D55). Rule: `spec/ui-standards/controls.md` § Footer button identity: standard icon-less `CancelButton`/`OkButton`/etc., confirm carries the emphasis (`primary`, `danger` when destructive), never an icon.

| Id  | Where                                                                 | Fix                                                                                                                                       |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | `list/actions/DeleteInternalOrdersAction.tsx:146-178`                 | Cancel → `CancelButton`; delete confirm → `variant="danger"`, icon-less; Close → icon-less. Copy `stocktakes/list/actions/DeleteStocktakesAction.tsx`. |
| A2  | `detail/actions/DeleteInternalOrderAction.tsx:88-120`                 | Same: `CancelButton`; icon-less `danger` confirm; icon-less error-Close.                                                                    |
| A3  | `detail/actions/DeleteLinesAction.tsx:148-182`                        | `CancelButton`; confirm `secondary`→`danger`, icon-less; Close icon-less. Copy `stocktakes/detail/actions/DeleteLinesAction.tsx:130-138`.   |
| A4  | `detail/actions/UseSuggestedQuantitiesAction.tsx:84-116`              | `CancelButton`; confirm → emphasised `OkButton` (primary, non-destructive), icon-less; Close icon-less.                                     |
| A5  | `detail/InternalOrderStatusFooter.tsx:208-238` (send-confirm dialog)  | Cancel → `CancelButton`; OK → `OkButton` (with `loading`); Close icon-less. The multi-phase `Dialog` itself is legitimately composed (exceeds `ConfirmDialog`'s preset) — keep. |
| A6  | `list/create/CreateInternalOrderModal.tsx:331-340`                    | Drop `icon={<PlusCircleIcon/>}` from the footer **Create** button (keep `confirms="plain"` + label — D55's bespoke-label case).             |
| A7  | `list/create/StocktakeWarningDialog.tsx:35-39`                        | Hand-rolled Cancel → `CancelButton`. (The three-action gate itself is well-designed boutique — keep.)                                       |
| A8  | `detail/InternalOrderStatusFooter.tsx:147-156`                        | Hand-rolled footer Close → `CloseButton` (regains the phone icon-collapse). Copy `outbound-shipments`' `OutboundStatusFooter.tsx:112`.      |

### Cluster B — detail header composition (structural)

| Id  | Where                                                                       | Fix                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | `detail/InternalOrderDetailView.tsx:1066-1091` + `detail/InternalOrderToolbar.tsx:172-295` + `InternalOrderToolbar.module.css` | Recompose the header field cluster as `HeaderToolbar` (label-above controls, `FormRowItem` weights where data needs unequal shares; drop the `FieldRow` wrappers, the `aria-hidden` spacer, and the module.css row-claim — delete the file). Registry: "a detail screen's header fields use `HeaderToolbar`"; 7 siblings agree. Copy `stocktakes` / `customer-returns` detail toolbars. Info notices → the `alert` slot (see decisions 1–2). |
| B2  | `detail/InternalOrderAncillaryBanner.module.css` + `…Banner.tsx:57-116`      | Replace the hand-rolled flex classes: `.row`/`.actions` → `HStack`, `.plan` → `Stack`, `.planRow` → `HStack justify="space-between"`; keep CSS only for the popover's `max-inline-size` measure. (Where the banner *lives* is decision 1.) |

### Cluster C — inline styles / hand-rolled flex (reach-for order rung 5: an inline `style` is always a finding)

| Id  | Where                                                                                     | Fix                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| C1  | `detail/InternalOrderDetailView.tsx:566-573, 688-694, 797-803` (item-name / requested / reason cells) + icon `style={{color:'var(--error-main)'}}` at `:697, :806` | Cells → `HStack gap="sm"`; icon colour → a scoped CSS-module class (icons paint with `currentColor`).                      |
| C2  | `list/InternalOrdersList.tsx:278-296` (colour-tag + name cell)                             | Inline-flex span → `HStack gap="sm"` (4 sibling lists agree); add `variant="row"` to the `ColourTagPicker` (5 siblings agree). |
| C3  | `list/create/CreateInternalOrderModal.tsx:277-291` (emergency order-type option row)       | Inline-flex + inline icon colour → `HStack`/scoped class. (Same markup duplicated in requisitions — library candidate L4.)    |

### Cluster D — side panel

| Id  | Where                                                | Fix                                                                                                                                                                          |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | `detail/InternalOrderSidePanel.tsx:164-177, 185-195` | Hand-rolled `<A class={styles.link}>` → `RecordLink`: shipment rows **neutral** (no `kind` — the current orange `--primary-main` tone is wrong for a shipment), created-from-requisition `kind="io"`. Then delete `InternalOrderSidePanel.module.css` (its one `.link` rule becomes redundant). Copy `OutboundSidePanel.tsx:264-269`. |
| D2  | `detail/InternalOrderSidePanel.tsx:131-136`          | **Gating bug (spec wins, `ui-surface.md:211`):** colour picker is live on read-only orders while the comment field is correctly gated. `<Show when={editable} fallback={<ColourTagDot/>}>` around `ColourTagPicker variant="field"` — the 4-sibling pattern (`RequisitionSidePanel.tsx:118-126` et al.). |
| D3  | `detail/InternalOrderSidePanel.tsx:171-174, 189-191` | Created-on/by hover annotation uses native `title=` (invisible to keyboard, inconsistent for AT) → `Popover openOnHover` per `OutboundSidePanel.tsx:243-256`.                    |
| D4  | `detail/InternalOrderSidePanel.tsx:207-209`          | Add `data-testid="grand-total-field"` to the grand-total `<strong>` (parity with `RequisitionSidePanel.tsx:181`).                                                               |

### Cluster E — spec-anchored + small fixes

| Id  | Where                                               | Fix                                                                                                                                                                              |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E1  | `list/InternalOrdersList.tsx:438-502`               | **Implementation bug (spec wins, `ui-surface.md:49` / AC-L7):** Sent/Finalised/disabled-supplier rows are not visually distinguished as read-only. Add a row tone keyed to `!isRowEditable(row)`, mirroring the detail table's placeholder `rowTone`. |
| E2  | `detail/InternalOrderDetailView.tsx:699`            | Excess-warning icon's accessible name is just "Requested" — meaning by colour alone. Give it an excess-specific label (new key in `src/intl/locales/en/` only).                        |
| E3  | `list/create/CreateInternalOrderModal.tsx:124-135`  | On-hold suppliers dimmed with no textual marker — `controls.md` § Blocked affordances requires "dimmed, **marked**, unselectable", never dimming alone. Append a muted "(on hold)" token to the option label (new en key). |
| E4  | `detail/InternalOrderDetailView.tsx:1266`           | `as { mode:'edit'; line }` union cast → assign the accessor once and narrow by `.mode` (drops the `as`).                                                                              |

## Spec edits (source-of-truth changes — need explicit sign-off)

All pure-UI drift: the standards/registry win, the spec moves (`MIGRATING_A_VERTICAL.md` § Spec consistency).

| Id   | Spec location                        | Edit                                                                                                                                                                                    |
| ---- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SE1  | `ui-surface.md:35` (S1 columns)       | Number column header: the impl (and the invoice-list house pattern) renders language-neutral `#`, not the `label.number` string. State the header renders `#`.                            |
| SE2  | `ui-surface.md:58` (S2)               | Drop "fixed 700×700" — a px/CSS leak forbidden by `AUTHORING.md`, and stale (impl: width ≈44rem, min-height only).                                                                        |
| SE3  | `ui-surface.md:47` (S1 Export)        | "Export CSV" → the shared split export (CSV **or** Excel), matching the house `ListExportAction` every list mounts.                                                                       |
| SE4  | `ui-surface.md:212` (S5 links)        | Name the **related-record-link role** for the shipment / created-from-requisition links so spec-build deterministically produces `RecordLink` (shipment neutral, requisition io-kind).    |
| SE5  | `ui-surface.md:52` (S1 condensed)     | **Settled by precedent (D33/D7):** rewrite the sentence to state what the app does — the compact band adds the _Number of rows_ column; the filter toolbar and Export stay at every width — with a divergence link, mirroring the stocktakes D33 phrasing. **Plus a new `DIVERGENCES.md` entry** (internal-orders — condensed tablet layout): reference app omits filters + Export on condensed tablet, this FE keeps them, rationale per D7 ("the full layout never hides an action the user expects") and D33 (configurable columns cover the leaner set). |
| SE6  | `ui-surface.md:237` (S7)              | Delete the stale "informational toast" sentence: the Add control is disabled on non-Draft orders (S3 + impl agree) so the path is unreachable, and Toast is a ⛔-reserved role that MUST NOT carry a user-initiated outcome. |
| SE7  | `spec/ui-standards/components.md` "Modal-level tabs" row | Note update: 🔶 "not yet exercised in a modal" is stale — the create modal (here and requisitions) hosts `Tabs` inside `Dialog`.                                        |

## Decisions needed (yours — blocking only the item named)

**Operator ruling (2026-07-31): decisions 1–2 deferred until later.** The B1 fix therefore moves only the field cluster to `HeaderToolbar`; the ancillary banner and the info notices keep their current placement (their own full-width rows) so nothing is entrenched before the ruling.

1. **[OPEN — deferred] Ancillary banner placement after the B1 `HeaderToolbar` move.** The banner carries **controls** (Details popover + Add/Update button + inline error), but `HeaderToolbar`'s `alert` slot is documented for a *compact content-hugging chip*. **Recommendation: keep it as its own full-width row beneath the header cluster** (cleaned per B2) — forcing it into the chip slot would be a compromise composition; a future action-bearing banner slot is an `ADDING_A_COMPONENT.md` task if wanted.
2. **[OPEN — deferred] Two simultaneous header notices** (`cannot-edit-disabled-store` + `cannot-edit-program` can both show; the `alert` slot is designed around one chip). **Recommendation: stack both compact `Alert` chips in the slot if its API takes arbitrary JSX; otherwise show the more specific one.**
3. **[RESOLVED by precedent — D33/D7]** DIVERGENCES entry for SE5: the app has decided this exact question before (stocktakes D33 records the reference app's simplified tablet layout — hidden Export, leaner columns — as deliberately not implemented; D7 states the full layout never hides an expected action; the requisitions spec carries no condensed-omission claim). SE5 proceeds as a spec rewrite + a new DIVERGENCES entry.

## Boutique / sanctioned (no change)

- **Line-editor chart region** — the registered Charts group (this modal is its named first consumer); the surrounding `.charts`/`.breakdown` width caps are justified level-4 page CSS (`ContentContainer`'s 3 presets can't supply two chart-fitted caps).
- **`.panels` wrapping flex row** (line editor) — the sanctioned interim for the ⛔ "Modal content columns (`Columns`)" registry row.
- **Three-action stocktake warning gate** — deliberately exceeds `ConfirmDialog`; Enter can't skip the warning (only *Go to Stocktakes* claims a confirm role). Keep.
- **Send-confirm multi-phase state machine** (status footer) — legitimately composes raw `Dialog`; only its footer buttons are findings (A5).
- **Plugin column region + `pluginViews.ts` DTO remap** — both the documented SDK-contract exceptions (config-driven `Column[]`; the one sanctioned GraphQL remap boundary).
- **Client-side line sort/filter** in the detail view — spec-acknowledged backend gap (`contract.md` § Backend gaps, PR #12526).
- **Item shown as disabled `TextField` in the line editor's update mode** — matches the closest sibling (requisitions); inbound differs (2-vs-1 split), not a finding.
- **`.latest` mount-time reads in the list** — match the reference vertical's documented intentional shape; the KDD-vs-reference tension is a central reconciliation item (L7), not this vertical's defect.

## Library findings — RESOLVED in the follow-up pass (operator-approved, 2026-07-31)

| Id  | Gap                                                                                                                     | Resolution                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | Item picker capped at the combobox's long max-width; doubled-class hacks in 2 line editors.                               | Narrower than audited: `AsyncCombobox` already had `width` — only the `ItemSearch` binding lacked the passthrough. Prop added; both `.itemField.itemField` hacks deleted (internal-orders + requisitions).                                                                    |
| L2/L4/L5 | Hand-rolled "value + trailing marker icon" cells and option rows; no semantic-tone icon; markers silent to AT.       | New **`StatusMarker`** (`ui/elements/feedback`) — Alert's severity vocabulary as a bare inline glyph, REQUIRING its meaning as `label` (`role="img"`; the raw icons are `aria-hidden`, so every hand-rolled marker was silent + colour-only). Adopted at all 6 sites (internal-orders + requisitions cells and create-modal option rows); the per-screen `.errorMarker`/`.emergencyMarker` CSS modules deleted. Registered in the registry, `UI_ELEMENTS.md`, and the Feedback showcase. |
| L3  | Colour-tag + name cell assembled 3 different ways across 7 lists.                                                          | **No component** (operator call — a trivial wrapper vs explicit composition, per `ADDING_A_COMPONENT.md`'s own "borderline" list). Instead the two divergent lists (requisitions: inline-flex span + missing `variant="row"`; prescriptions: bare fragment) were normalised to the direct house pattern (`HStack gap="sm"` + `Show` picker/dot + name) all 7 now share. |
| L6  | Chart-panel heading treatment hand-rolled by both chart consumers.                                                        | Deferred — rule of three not met.                                                                                                                                                                                                                                              |
| L7  | `kdd/solid-reactivity-pitfalls` mandates the `.state` gate yet the reference list reads `.latest` on mount-time resources. | Open — a central KDD/reference reconciliation for the KDD's owner, not a per-vertical change. Surfaced, not settled here.                                                                                                                                                     |

Verified after the library pass: `pnpm check` green, `pnpm test` green (1315), reactivity review of the diff clean. Requisitions' excess-marker also picked up the correct accessible name (`messages.requested-exceeds-suggested` — it had the same column-name-as-label bug as E2).

## Verification (done)

- `pnpm check` green (CSS types, tsc, stylelint, theme contract, page-CSS guard, browser floor).
- `pnpm test` green — 135 files, 1315 tests.
- `check-reactivity` over the working diff: **0 issues** (one benign candidate — `destinationSeed()`'s prop read, invoked from JSX so tracked at call time; pre-existing pattern).
- **Your visual pass remains** — list above under _Outcome_.
