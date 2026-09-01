# Requisitions — UI-migration report

**Status: FIXES APPLIED — `pnpm check` ✅ · `pnpm test` (1315) ✅ · post-fix reactivity pass ✅ · operator visual pass OUTSTANDING.**

Scope: the whole `src/sections/requisitions/` vertical, audited against the eleven dimensions of [`MIGRATING_A_VERTICAL.md`](../../ui/docs/MIGRATING_A_VERTICAL.md), the [component registry](../../../spec/ui-standards/components.md), the binding [`SIDE_PANEL.md`](../../ui/docs/SIDE_PANEL.md) contract, the stocktakes reference, and the sibling verticals — above all **internal-orders**, the freshly-migrated mirror. The audit ran five parallel passes (list, detail, panel+editor, reactivity, spec-consistency); every finding was verified in source before fixing (one agent claim was disproven and dropped — `messages.confirm-delete-requisitions` exists at `en/common.json:2469`).

## Coverage table (greened)

| Screen | 1 Registry | 2 Compose | 3 Tables | 4 Inputs | 5 Detail/panel | 6 Styling | 7 Reactivity | 8 Types | 9 A11y | 10 Test hooks | 11 Spec |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| List screen | ✅ | ✅ F12 | ✅ | ✅ F14 | ✅ | ✅ | ✅ | ✅ | ✅ (L3 flagged) | ✅ | ✅ |
| Create modal + Create order | ✅ F13 | ✅ | ✅ F15 | ✅ | ✅ | ✅ | ✅ F16 | ✅ | ✅ | ✅ | ✅ S2/S3 |
| Detail shell | ✅ | ✅ F12 | ✅ F10 | ✅ | ✅ | ✅ | ✅ F11 | ✅ F9 | ✅ (L3 flagged) | ✅ F10 | ✅ S6 |
| Detail toolbar | ✅ F1/F3 | ✅ F1 | — | ✅ F2 | ✅ F2 | ✅ F1 | ✅ | ✅ | ✅ | ✅ | ✅ S4/S5 |
| Status footer | ✅ F5/F6 | ✅ | — | ✅ D2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ :164 |
| Detail actions | ✅ | ✅ | — | ✅ | ✅ F7/F8 | ✅ | ✅ | ✅ | ✅ | ✅ F7 | ✅ |
| Side panel | ✅ F17 | ✅ | — | ✅ F18 | ✅ F17 (L4 flagged) | ✅ F17 | ✅ | ✅ | ✅ F17 | ✅ | ✅ |
| Line editor | ✅ F20 | ✅ | — | ✅ F19 | ✅ F19/D3 | ✅ (L2 flagged) | ✅ | ✅ | ✅ | ✅ | ✅ S7–S9, F21 |
| Line stats | ✅ F22 (L1 flagged) | ✅ | — | ✅ | ✅ | ✅ F23 | ✅ | ✅ | (L1 flagged) | ✅ | ✅ |
| Documents tab | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | B1 open |

The SIDE_PANEL.md sign-off checklist passes on every composition item; its final item (render + visual confirm) is part of the operator visual pass below.

## What was fixed (25 findings + 6 ruled decisions)

**Detail header (the headline).** `RequisitionToolbar` rebuilt as label-above `FormRowItem` children of `HeaderToolbar` (F1), its CSS module deleted; the four never-editable facts (Customer name, Destination customer, Approval status, Program — a dash when empty) now render as `LabelledValue variant="field" size="small"`, not disabled controls (F2); the disabled-store notice rides the `alert` slot as a compact chip (F3); the whole-record header-save rejection keeps its own full-width error row beneath the cluster (**decision 1**, the ancillary-banner row treatment).

**Status footer.** Labelled `CloseButton` back to the list (F5); both dialogs' footers now the standard icon-less `CancelButton`/`OkButton` + secondary `confirms="plain"` Close for no-submit phases, wiring Enter-to-confirm (F6); the disabled "Confirm New" option removed — forward statuses only per D40 (**decision 2**).

**Detail shell.** `editorInitialLine()` accessor replaces the `as` cast (F9); the line-table empty state branches on the active filter and stamps the contracted `add-item-button` id (F10); `columns` is a `createMemo` (F11); `createAddAction` + `ALT_N` on the Add split button and empty ghost, `ALT_M` on More (F12).

**List + create flow.** `createAddAction` + `ALT_N` on New and the empty ghost (F12); the empty-ghost label is `button.create-a-new-one` and the number header `'#'` (**decisions 4–5**, matching the mirror); bulk-delete OK carries `confirms="plain"` and its error phase a secondary Close (F14); the create modal's footer Create is icon-less with `confirms="plain"` (F13); the create-order picker columns ride `getCellDefinition` presets (F15); its rows read is `.state`-gated, closing the latent modal-detach (F16).

**Side panel.** Shipment rows are now `Text` + `Popover openOnHover` label + neutral `RecordLink` (keyboard-accessible annotation, no hand-toned `<A>`); the CSS module is deleted (F17); `ColourTagPicker variant="field"` (F18).

**Line editor + stats.** Never-editable figures (our SOH, suggested, approved, remaining, issued, customer MOS, available, target population) render as plain right-aligned text rows, not disabled inputs; state-locked editable figures keep honest disabled chrome (F19). Save & next stays available on a read-only requisition, where — with nothing to write — it advances without saving (**decision 3**). On an editable requisition the editor now follows the internal-order shape: Save is enabled whenever a line is loaded (no `dirty` gate), and Save/Save & next always persist the current line — so a freshly picked item saves as a zero-quantity placeholder without a prior edit (AC-LE2), matching the sibling vertical. Captions use `HStack justify="between"` (F20); the extended Incoming figure is `label.incoming` (F21); the `ⓘ` glyph is the shared `InfoIcon` (F22); the `0.75rem` literal is `var(--text-xs)` (F23).

**Conventions.** All out-of-vertical imports use the `@/` alias (F24); the empty `detail/lines/` directory is gone (F25).

## Spec edits applied (`spec/requisitions/ui-surface.md`)

:5 link typo · :76/:87 create-failure prose → inline-in-dialog (D21/D22) · :71 emergency marker on order-type options · Toolbar section rewritten to the header-field-cluster arrangement (read-only labelled values, alert chip, error row beneath) · line-table empty-state gate + filtered-empty variant · footer prose: Close button added, Confirm New removed (D40) · transferred-reason carve-out (D86) · never-editable figure prose (§ layout + read-only figures) · Save/Save & next semantics per decision 3 · S6 deletion prose (success copy + unreachable clause dropped) · not-found re-roled to the confirmation dialog (**decision 6**). `contract.md`'s "near-silent"/toast notes stay — they capture the *reference* client, which these decisions deliberately diverge from.

**Not applied here (out of this vertical's scope, flagged for their own passes):** the same stale two-column Toolbar prose in `spec/internal-orders/ui-surface.md`; the mirror's shared `label.incoming-stock` drift in its line editor.

## Library tasks surfaced (flagged, not fixed — shared code changes are separate work)

| # | What | Disposition |
| --- | --- | --- |
| L1 | Line-editor stats charts hand-rolled: the Customer-tab breakdown near-duplicates the built `TargetQuantityBreakdown` (verified class-for-class CSS copy; response-side differences are variant-shaped), and the My-store proportional stacked-bar pair + legend has no registry role. Includes the title-only bar-value a11y gap and the library CSS's own `0.75rem` literal. | `ADDING_A_COMPONENT.md` task: response variant of `TargetQuantityBreakdown`; stacked-proportion-bar chart + `ChartLegend` value slot + registry row. Hand-roll stays as the recorded interim. |
| L2 | `NumberField` has no `align` prop — the editor's right-aligned figure box keeps the `.figure.figure input` specificity hack for its remaining editable rows. | `ADDING_A_COMPONENT.md` task (`align="end"`); the CSS is the documented interim. |
| L3 | Column-header description tooltips are native `title` (2 list + ~8 detail headers) — mouse-only; `InfoTooltip` is untested inside a sortable header. | `ADDING_A_COMPONENT.md` task (a `headerInfo` slot on the column model); `title`s stay meanwhile (house precedent). |
| L4 | Side-panel grand-total `<strong>` has recurred on a third panel — `SIDE_PANEL.md` says promote on recurrence. | Promote a standard total-row treatment into the panel library; the mirror-identical `<strong>` stays meanwhile. |
| L5 | `e2e/TESTIDS.md` has no Requisitions/Internal-orders section for the verticals' screen-specific ids. | TESTIDS extension task (shared with internal-orders). |

## Out-of-scope behaviour gap

**B1** — `RequisitionDocumentsTab.tsx` hard-codes `canDelete: false` where `rules.md` grants Remove for an own-record document (`document.recordId === node.id`), confirming first. Behaviour, not composition — needs its own spec-conformance fix.

## Deferred / open

- The **server-paginated line table** interim (client-side filter/sort over the nested connection) stays, blocked on open-msupply PR #12526 — identical in the mirror, documented in-code and in the spec README.
- Reactivity BENIGN notes recorded by the audit (mount-time `context.latest` race, `<For>` over replaced node arrays, object-replacing single-draft signal) match the reference verticals' documented shape — for the KDD owner's reconciliation, not this vertical's defects.

## Operator visual pass (required — static checks can't see "looks wrong")

Compare in **light and dark**, against the showcase + references:

| Route | Compare against | Look for |
| --- | --- | --- |
| `/…/distribution/customer-requisition` (list) | `#/showcase/table`; internal-orders list | `'#'` header width; filter chips; empty-state ghost label; Alt+N badge on New |
| List → New requisition modal | internal-orders create modal | icon-less Create; Enter confirms on the Program tab |
| List → Create order (pick step) | `LinkInternalOrderModal` (inbound) | picker column widths (created/comment/customer/reference) |
| `/…/customer-requisition/:id` — header | **`#/showcase/header`**; internal-orders detail | label-above cluster wraps as a unit; read-only facts have no input chrome; disabled-store chip rides the row end; header-save error appears as its own row |
| Detail — footer + dialogs | internal-orders footer | Close button; two-option split menu; icon-less dialog buttons; Enter-to-confirm |
| Detail — side panel | `#/showcase/side-panel`; internal-orders panel | shipment rows read "Shipment #N" with a hover/focus popover; colour tag field variant; value alignment |
| Detail — line editor (edit + read-only open) | internal-orders line editor | read-only figures as text lines up with the input column edge; Save enabled whenever a line is loaded (placeholder-saveable, no dirty gate); Save & next enabled on read-only, walking without saving there; captions rhythm |
| Line editor — stats tabs | (hand-rolled interim — L1) | info-glyph empty notes; nothing regressed |
