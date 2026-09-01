# R&R forms — UI migration report

Scope: the whole vertical (`src/sections/rnr-forms/`), audited and migrated
2026-08-19 against the eleven dimensions of
[`MIGRATING_A_VERTICAL.md`](../../ui/docs/MIGRATING_A_VERTICAL.md), the registry,
the showcase source, `stocktakes/`, and the sibling verticals.
Status: **fixes applied and verified** — `pnpm check` green, `pnpm test` green
(1757), anchor guard green. **The human visual pass remains** (list below).

## Coverage (after fixes)

| Screen                              | 1 Registry | 2 Composition | 3 Tables | 4 Inputs | 5 Forms/panels | 6 Styling | 7 Reactivity | 8 Types | 9 A11y | 10 Test hooks | 11 Spec |
| ----------------------------------- | ---------- | ------------- | -------- | -------- | -------------- | --------- | ------------ | ------- | ------ | ------------- | ------- |
| List (+ bulk delete)                | ✅         | ✅            | ✅       | ✅       | ✅             | ✅        | ✅           | ✅      | ✅     | ✅            | ✅      |
| Create modal                        | ✅         | ✅            | ✅       | ✅       | ✅             | ✅        | ✅           | ✅      | ✅     | ✅            | ✅      |
| Detail (view + line table + footer) | ✅         | ✅            | ✅       | ✅       | ✅             | ✅        | ✅           | ✅      | ✅     | ✅            | ✅      |
| Side panel (+ actions)              | ✅         | ✅            | —        | ✅       | ✅             | ✅        | ✅           | ✅      | ✅     | ✅            | ✅      |
| Routes                              | ✅         | ✅            | —        | —        | —              | ✅        | ✅           | ✅      | —      | —             | ✅      |

The side panel passed the binding `SIDE_PANEL.md` sign-off checklist clean at
audit time and is unchanged apart from the delete action's `onDeleted` contract.
Reactivity was clean at audit (the two `.latest` reads are the sanctioned
first-load case; the draft store follows the KDD exactly).

## What was fixed

**List** — status-chip column sized (`7.5`/`9.375rem` pair); Period through the
`name` preset (card-primary), Program through `campaign`, Supplier through
`supplierName`; a `FilterBar` with the **Created** date-range chip, URL-backed
(`listFilters.tsx`, exhaustive expose-or-dismiss map); bulk delete rebuilt on
the sibling shape — shared `delete-lines-button` id, `t('button.delete')` (the
old `button.delete-lines` key mistranslates in Arabic), `selectedIds` +
`canDelete` props, per-open `Body` snapshot, Cancel hidden while deleting,
`dialog-button-cancel` stamped; `STATUS_COLOURS` colocated into
`rnrFormStatus.ts`.

**Create modal** — the closed-periods hint is the period `Combobox`'s own
`helperText`; already-used periods carry the textual marker
`(label.rnr-period-used)`; all four required lookups `clearable={false}`;
`gated` typed against Solid's `Resource<T>`; the supplier prefill resolves the
real `NameOption` via `fetchNameById` (no more fabricated flag fields).

**Detail** — 8 line columns moved onto their `getCellDefinition` presets
(`itemName`+primary, `unitName`, `losses`, `amc`, `expiryDate`, `requested`,
`comment`, `approvedQuantity`); card view added (`CARD_GROUPS` 'more' + compact
`viewMode: 'card'`, item name titles the card); client-side sort over the
bounded line set (16 sortable columns, name-asc default — the sibling
fixed-line-set pattern); filter chip seeded present-as-null, URL-backed,
`placeholder.search`, `debounceMs={0}`, filter-aware empty message; both inline
styles replaced with `HStack` (marker leads the number, `justify="end"` keeps
the digit edge); More button advertises `ALT_M`; `rowTint="error"` on
balance-rule violations plus an `error` state on a negative Initial-balance
cell (`error.rnr-negative-balance` — also the Final-balance marker's meaning
label); low-stock severe/mild announce distinctly
(`messages.rnr-low-stock-severe`/`-mild`); the finalise machine extracted to
`actions/FinaliseRnrFormAction.tsx` with phase-named confirms
(`button.save-and-confirm-status` / `button.show-error-lines`, never a bare
OK); footer drops the misused `actions-footer` testid and dates the Draft step
(`StatusIndicator` history); footer label uses `status.finalised`;
`toUpdateLineInput` annotated with the generated input type; redundant
`NonNullable` dropped; side-panel delete reports `onDeleted` (the view
navigates).

**New en keys** (en catalogue only, per the locale anti-default):
`label.rnr-period-used`, `error.rnr-negative-balance`,
`messages.rnr-low-stock-severe`, `messages.rnr-low-stock-mild`.

## Decisions taken (operator "ok" to the recommendations)

1. **List filters** — resolved as _Created chip only_: both siblings' filter
   maps dismiss `programId` as programmatic, so the audit's "Program chip"
   half had no house pattern; the exhaustive map records the dismissal.
2. **Search highlight + scroll** — spec + case moved: `.50` reworded (logged in
   [`acceptance.md`](../../../spec/rnr-forms/acceptance.md)); the chip removes
   non-matches, making highlight redundant.
3. **Comment cell** — stays single-line (two siblings agree; no multi-line cell
   editor exists); the spec's "multiline" reworded.

## Spec/registry/doc edits applied

`spec/rnr-forms/ui-surface.md`: selection-exclusion clause removed (S1
self-contradiction); card-view lines added (S1 + S3); delete-dialog title +
Close dismissal + `error.something-wrong` named; S2 helper-text-beneath (not
italic-above), no-clear-affordances clause, period marker named, ✕ named;
"Full screen" reassigned to table chrome; search restated as the default filter
chip at stocktakes' altitude; virtualised-rows, Enter-advances, confirmed-tone
and white/muted-cell clauses dropped; client-side sort stated; lifecycle
indicator + side-panel title named; finalise confirms' verbs named; S4
line-save contradiction collapsed (one owner, linked). `rules.md`: S2→S3 link
text. `cases/OMS-REG-REPL-07` `.50` reworded + `acceptance.md` change log.
`spec/ui-standards/components.md`: Confirmation-dialog row now sanctions the
phased/async `Dialog` composition. `e2e/TESTIDS.md`: `delete-lines-button`
(shared) replaces the bespoke id; Created chip documented; default-chip and
`dialog-button-cancel` notes.

## Library findings (flagged, NOT fixed here)

- **DataTable a11y (serious, three):** horizontal-scroll box not
  keyboard-reachable (on a finalised form the 18 unpinned columns are
  unreachable by keyboard); `<table>` has no accessible name; clickable rows
  not keyboard-operable (KB-N1/E5). → file as issues.
- **No row virtualisation** in `DataTable` (the spec claim was dropped; the
  line set is bounded, but large programs deserve the issue).
- **`headerInfo` slot on the column model** — rnr's header `InfoTooltip`s
  (kept, now in `HStack`) are the third vertical to need this; requisitions
  already filed it. Promote, then requisitions drops its mouse-only `title`s.
- **`SelectReportModal`** — iconed raw footer buttons incl. Cancel; format
  buttons carry no busy state (shared by ≥5 verticals).
- **`Combobox`** — `error` suppresses `helperText`; no coexisting-hint slot.
- **`NameSearch`** — could accept a `Pick<NameOption,'id'|'name'>` seed
  (this vertical now resolves via `fetchNameById` instead); its own
  `renderRow` also carries inline styles.
- **`FieldRow` trailing colon** — `detail-views.md` says colon, the component
  renders none; app-wide, needs its own decision.

## Boutique / uncovered elements

- **The inline-editable line table** — composed entirely from library parts
  (the returns edit-modal + showcase editable-cell pattern); the repo's
  largest instance, not boutique.
- **`headerWithInfo`** — candidate `headerInfo` library slot (above).

## Deferred / remaining

- **The human visual pass** (this skill does not sign it off). Open, in light
  AND dark, against `#/showcase/table`, `#/showcase/header`,
  `#/showcase/side-panel` and the stocktakes screens:
  - the **list** (`…/replenishment/r-and-r-forms`): column widths + drag
    resize, the Created chip, status-chip column, card view under 600px;
  - the **detail**: the 20-column widths (esp. the 8 now preset-driven),
    header info icons not clipped by the 2-line clamp on narrow right-aligned
    headers, marker-before-number cells, the error row tint, card view,
    sort affordances, the seeded search chip;
  - the **create modal**: helper text under Period, the "(Already used)"
    option markers, no clear ×s;
  - the finalise dialog's two confirm verbs; the Draft date in the status
    history popover.
- The deterministic e2e suite (separate task; COVERAGE.md marks the rows).
