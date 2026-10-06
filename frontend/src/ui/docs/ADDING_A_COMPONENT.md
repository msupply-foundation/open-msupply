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
- [ ] **Motion** — any transition/animation reads a `--motion-*` token, never a literal duration ([STYLING.md § Motion check](./STYLING.md#motion-check-step-6)); that is what makes `prefers-reduced-motion` hold without the component writing a media query.
- [ ] `pnpm check` green.

## Open follow-ups (#550 audit)

### Adoption sweeps — the component exists; verticals still bypass it

- **`HStack` full sweep** — ~40 inline `flex` / `flex-direction: column` sites remain (only OutboundSidePanel + the Settings clusters are swapped so far). Folds into the full component-replacement pass; the enforcement guard is tracked in #639.
- **`DateField` adoption** — 2 `TextField type="date"` bypasses (`customer-returns/detail/edit-modal/returnLineColumns.tsx`, `stocktakes/list/CreateStocktakeModal.tsx`) → `DateField`. The narrow footprint is already covered by its `compact` width preset (there is no `width="date"` gap).
- **`RecordLink`** — visual verification outstanding.
- **Move-button refocus (`ColumnSettings`)** — the Columns popover's Move up/down pair (`ui/elements/table/ColumnSettings.tsx`) loses focus to the body on every press: a reorder moves the row's DOM node, and Chromium blurs whatever was focused inside a node it detaches and re-inserts, so a keyboard user can press Move up exactly once. `ReorderableList` fixes it — the move buttons are held in a ref map keyed by row id + direction and refocused after each move, falling back to the opposite button where the pressed one is disabled by its own move (`ui/elements/inputs/ReorderableList.tsx`, and its ledger row). That pair also re-rolls the same rotated-chevron glyph. Adopt the technique when the Columns popover is next touched; the control itself stays its own (its rows carry a visibility checkbox and the pin pair, so it is not a `ReorderableList`).

### Design decisions to surface (KDD-governed — flag, don't silently refactor)

- **`DropdownMenu`** — a generic overflow/action menu needs a ruling first: sanction two popup-surface looks (inset rounded pills vs edge-to-edge divided rows) or pick one house style. Parked on #643; no pending consumer.
- **Shared line-edit modal shell** (5 verticals) — full-shell extraction is a team call vs KDD; the defensible bits are `createLineDraft` draft-store CRUD and a responsive `FieldCluster` row.
- **`BulkDeleteButton(mutation, label)`** — was `SelectionActionModal`, deliberately inlined (`kdd/action-modal`); a narrow wrapper could reclaim ~4–5 atomic-batch deletes.
- **`ExportPrintButton` (4×) / `HoldToggle` (4×)** — trivial wrappers, borderline vs explicit-composition.
- **Library `ErrorBoundary` / `GenericErrorFallback` / `DataError`** — reference-parity, low urgency; the app has an app-level `UnexpectedErrorModal` only.
- **Action-bearing header banner slot** — a standing-context row beneath the `HeaderToolbar` field cluster that carries **controls** (details popover, an apply action, inline error), which the alert chip slot may not hold (a compact alert is never actionable). Registered as a ⛔ role in the registry (App bar — action-bearing standing-context banner); sole consumer meanwhile composes its own `Toolbar` row (the internal-orders ancillary banner). Build when a second vertical needs one (operator ruling, 2026-07-31).

### Reference-parity primitives — adopt when a real consumer appears, don't pre-build

`ToggleButtonGroup`, `HierarchicalOptionAutocomplete`, content `Skeletons`, `InputModal`, `ListSearch`, linear `InlineProgress`.

**Closed:** `WizardStepper` — a real consumer appeared (the patient create wizard's step rail) and the existing determinate progress list (`ui/sync/ProgressList`) already fills the role, which is what the reference app does too (its `WizardStepper` is a thin wrapper over the same `HorizontalStepper` its sync stepper uses). The rail's navigation landed there too rather than in a component of its own (2026-10-05): a step marked `navigable` plus an `onStepSelect` makes that marker a button, the consumer owning which steps those are. Two open nits, both in `ProgressList` rather than a new component: the active step's marker ring stays the pale tone where the reference paints it the strong one, and the role lives under `ui/sync/` though it now has non-sync consumers.
