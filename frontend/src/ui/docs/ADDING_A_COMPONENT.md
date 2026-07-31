# Adding a library component

The checklist for adding a component to `src/ui/`, plus the open follow-ups from the #550 UI-library gap audit. The audit's landed components and adoptions are in [PR #692](https://github.com/msupply-foundation/open-msupply-frontend/pull/692) and git history; its app-layer logic extractions are split to #653 / #663 / #665 / #666.

## Checklist — do ALL of these when adding a `src/ui/` component

A component isn't done until every doc/surface that indexes it is updated. Miss one and the component is un-discoverable — and, critically, **un-enforced** for spec-driven rebuilds.

- [ ] **`spec/ui-standards/components.md`** — register the **role → component** row in the right section. This is what makes conformance requirement **C3** bite: an unregistered component can be hand-rolled without it counting as a "bespoke look-alike". _Non-negotiable._
- [ ] **`spec/ui-standards/<area>.md`** — if the component introduces or changes a cross-cutting rule, add/point a line (`layout.md` for layout primitives; `inputs.md` / `controls.md` / `tables.md` for those kinds).
- [ ] **`src/ui/docs/UI_ELEMENTS.md`** — add the ledger row (what it's made of + why); mandated by [`src/ui/CLAUDE.md`](../CLAUDE.md).
- [ ] **Showcase** — add a real demo (the component itself, no showcase-only chrome) to the relevant showcase page, and register it in the page metadata / TOC.
- [ ] **Sibling docs/comments** — update anything that referenced the gap (e.g. `Stack`'s doc comment once `HStack` existed).
- [ ] **KDD** — if there's a real rejected alternative, write/extend a `kdd/` entry.
- [ ] `pnpm check` green.

## Open follow-ups (#550 audit)

### Adoption sweeps — the component exists; verticals still bypass it

- **`HStack` full sweep** — ~40 inline `flex` / `flex-direction: column` sites remain (only OutboundSidePanel + the Settings clusters are swapped so far). Folds into the full component-replacement pass; the enforcement guard is tracked in #639.
- **`DateField` adoption** — 2 `TextField type="date"` bypasses (`customer-returns/detail/edit-modal/returnLineColumns.tsx`, `stocktakes/list/CreateStocktakeModal.tsx`) → `DateField`. The narrow footprint is already covered by its `compact` width preset (there is no `width="date"` gap).
- **`RecordLink`** — visual verification outstanding.

### Design decisions to surface (KDD-governed — flag, don't silently refactor)

- **`DropdownMenu`** — a generic overflow/action menu needs a ruling first: sanction two popup-surface looks (inset rounded pills vs edge-to-edge divided rows) or pick one house style. Parked on #643; no pending consumer.
- **Shared line-edit modal shell** (5 verticals) — full-shell extraction is a team call vs KDD; the defensible bits are `createLineDraft` draft-store CRUD and a responsive `FieldCluster` row.
- **`BulkDeleteButton(mutation, label)`** — was `SelectionActionModal`, deliberately inlined (`kdd/action-modal`); a narrow wrapper could reclaim ~4–5 atomic-batch deletes.
- **`ExportPrintButton` (4×) / `HoldToggle` (4×)** — trivial wrappers, borderline vs explicit-composition.
- **Library `ErrorBoundary` / `GenericErrorFallback` / `DataError`** — reference-parity, low urgency; the app has an app-level `UnexpectedErrorModal` only.
- **Action-bearing header banner slot** — a standing-context row beneath the `HeaderToolbar` field cluster that carries **controls** (details popover, an apply action, inline error), which the alert chip slot may not hold (a compact alert is never actionable). Registered as a ⛔ role in the registry (App bar — action-bearing standing-context banner); sole consumer meanwhile composes its own `Toolbar` row (the internal-orders ancillary banner). Build when a second vertical needs one (operator ruling, 2026-07-31).

### Reference-parity primitives — adopt when a real consumer appears, don't pre-build

`WizardStepper`, `ToggleButtonGroup`, `HierarchicalOptionAutocomplete`, content `Skeletons`, `InputModal`, `ListSearch`, linear `InlineProgress`.
