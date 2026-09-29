# Stocktakes — UI migration audit report

**Status: MIGRATION COMPLETE.** All approved fixes applied; spec-doc drift reconciled; `pnpm check` + `pnpm test` (835 tests) green; the reactivity review of the working diff came back clean. **The visual pass is yours** — see [_Your visual pass_](#your-visual-pass-required--the-skill-cannot-sign-this-off). The audit findings below are kept as the record of what was found and why.

## Outcome (migration complete)

### Code fixes — all applied, all green

| Finding                            | Resolution                                                                                                                                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 · D55 dialog footers (8 modals) | icon-less `StandardButtons`; destructive confirms **and** the delete/reduce triggers → `danger`; create dialogs labelled **Create**                                                                                    |
| R2/R3 · snapshot & doses cells     | line editor → disabled `NumberField` + native `error` slot; read-only detail table → `formatNumber` + a scoped `.lineError` class. Removed 4 inline `style`s; fixed the dropped formatting and the `'—'`-not-blank bug |
| R4 · expiry column                 | `getExpiryDateCell` (restores the near-expiry colour)                                                                                                                                                                  |
| R5 · create-modal date             | `DateField` (removed the native `type="date"`; dropped the now-unused `TextField`)                                                                                                                                     |
| R6 · manufacture date              | `max={localTodayIso()}` — future dates unselectable                                                                                                                                                                    |
| R7 · log-change cell               | `Stack gap="sm"` (was an inline flex column with a raw `0.25rem`)                                                                                                                                                      |
| R8 · "select an item" prompt       | `EmptyState graphic={false}`; deleted the `.selectPrompt` class                                                                                                                                                        |
| R9 · line-editor table columns     | wrapped in `createMemo` (reactivity §14)                                                                                                                                                                               |
| R10 · detail filters               | moved to the DataTable `filters` prop (new `StocktakeLineFilters`); description → `HeaderToolbar` label-above field; status → `HeaderToolbar` compact `alert` chip; dropped the page-header `<Toolbar>`                |
| R11 · detail card model            | `cardGroups` "More details" collapse; the 16 secondary columns routed to `cardGroup: 'more'` (title/badge already set)                                                                                                 |
| R12 · type cast                    | narrowed via a local const (removed the `as number`)                                                                                                                                                                   |
| J3 · `.addTitle`                   | dropped the inert `gap` (the rest is load-bearing, kept)                                                                                                                                                               |

### Decisions taken (yours)

- **Side-panel read-only facts** (J1): kept `FieldRow` (one aligned label column) **for now** — no code change; standardising `LabelledValue`-vs-`FieldRow` in mixed panels is deferred to the dev (question drafted in the session).
- **Reduce-to-0** confirm + trigger → `danger`; **bulk-delete triggers** → `danger`.
- **Snapshot cell**: the quick in-scope fix, **not** a new shared component.

### Spec-doc edits applied (SE1–SE8)

- **SE1 / SE2** — deleted the stale _"blind stocktake not built"_ (`ui-surface.md` intro + `README`) and _"four P1-feedback gaps not built"_ (`README`) claims: the code builds all of them, so a future `spec-build` reading those caveats would have **regressed**. Highest-value durability fix.
- **SE3** Location column `Sortable` no→yes (it has a real server sort key). **SE4** bulk-bar order → **Delete · Change location · Reduce to 0** (matches the code). **SE5** line-editor title described as _the item selector_ (combined flow, no mode label). **SE6** Batch/Pricing/Other re-described as the data-table **card model**, not "modal tabs". **SE7** dropped the never-built read-only **Unit** display. **SE8** S1 export label "Export CSV" → "Export (CSV/Excel)".

### Boutique / deferred (surfaced, not built)

- **Errorable number cell** — a shared `getNumberCell`-family fragment for "number + optional inline line-error", to de-duplicate the snapshot cell across the detail table and line editor. **Tag (a): candidate new library component** → its own `ADDING_A_COMPONENT.md` task. Deliberately **not** built here (a migration doesn't smuggle in new library components).
- **Mono `code`/`batch`/`location` cells + `getCellDefinition` width presets** (dim 3, BENIGN) — a tracked cross-cutting rollout gap (`CELL_TYPES.md` § Delivery status), not stocktakes-specific. Left to roll out with that programme.
- **Optional test-hook parity** (dim 10, BENIGN) — the detail selection footer's `testId="actions-footer"` and the initial-create dialog's button testids. No contract gap today; left as-is.
- **FL5 enumeration order** — only the on-screen **footer** order was reconciled (SE4); the FL5 bullet _list_ order in `ui-surface.md` was left (it enumerates the actions, it doesn't claim their on-screen order).
- **`DIVERGENCES.md`** — SE5/SE6/SE7 describe this app's combined-flow title / card model / absent Unit display; if any is a deliberate delta from the reference app it may warrant a one-line `DIVERGENCES.md` entry. Not added speculatively — **your call**.

### Your visual pass (required — the skill cannot sign this off)

Static checks can't catch "compiles clean but looks wrong". Open each migrated screen in **light and dark** and compare against its showcase page + the reference:

- **Detail line table** (`#/showcase/table`, `#/showcase/detail-views`) — the "More details" card collapse on a narrow viewport; the expiry near-expiry colour; the snapshot number formatting + the error line beneath it.
- **Line editor** (`#/showcase` → LineEditModal) — snapshot/doses now render as disabled number fields; the `EmptyState` prompt before an item is picked; the manufacture-date bound; icon-less **Save** / **Save & next**.
- **Detail header** (`#/showcase/header`) — the description as a `HeaderToolbar` field; the on-hold/finalised status as a **compact alert chip** (was a full-width banner — the most visible change); the filters now in the **table toolbar**, not the header.
- **All 8 dialog footers** — icon-less; delete/reduce confirms **red**; create dialogs say **Create**.
- **Side panel** (`#/showcase/side-panel`) — unchanged (`FieldRow` kept per your call).

## Scope & method

- **Scope:** the whole `stocktakes` vertical — all ~21 screens/pieces (list + detail + side panel + toolbars + line-edit modal + log + all list/detail actions + `index.tsx`), each judged against all 11 dimensions.
- **Reference-vertical caveat:** `stocktakes/` is itself the library's reference vertical, so the "reference vertical" leg of comparison is self-referential. Every judgment here is against **the rules** (the dimension rule docs) and **the showcase source** (`src/ui-showcase/*Showcase.tsx`), never against stocktakes itself.
- **Method:** a mechanical scan (inline styles, colour/px literals, hand-rolled elements, retired APIs) plus seven parallel read-only dimension audits (1+6, 2+5, 3, 4, 7, 8+9+10, 11). Every candidate was re-verified against the code before it became a finding here; library-component APIs (`EmptyState`, `NumberField`/`TextField`, `StandardButtons`, `getExpiryDateCell`) and the D55 rule text were confirmed at source.

## Headline

The reference vertical is **in good shape**, and on spec it is even **ahead of its own stale status prose**. The substantive code work is **three clusters** plus a handful of small fixes:

1. **Dialog-footer drift (D55)** — ~8 action/create modals still hand-roll icon-bearing footer buttons and render destructive confirms as `secondary`, not `danger`. The line editor is the only modal already migrated. _Largest cluster; mechanical._
2. **The snapshot / doses number cell** — a bespoke "number + inline error" cell duplicated in the detail table and the line editor, carrying inline `style`, dropping `getNumberCell`'s locale formatting, and rendering `'—'` where blank is required. _Cross-cutting; one clean fix path._
3. **Detail header/toolbar composition** — the line filters live in the page header's `<Toolbar>` instead of the DataTable's `filters` prop (a binding `tables.md` rule the list already obeys), and the editable description should be a `HeaderToolbar` field. _Structural; needs your sign-off._

Everything else is small, benign, or a **spec edit**. The spec reconciliation is substantial and is listed separately for your explicit sign-off — most of it is the spec's status prose being out of date, which would make a future `spec-build` **regress**.

## Coverage table (screens × 11 dimensions)

Legend: ✅ clean · _n_ = REAL findings · ⚠ = decision needed (your call) · ° = benign/consistency/optional (see notes) · — = dimension N/A.

Dimensions: **1** C3/registry · **2** composition · **3** tables · **4** inputs · **5** forms/side-panel · **6** styling · **7** reactivity · **8** types · **9** a11y · **10** test hooks · **11** spec.

| Screen / file                                 | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  |
| --------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| list/StocktakesList.tsx                       | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | °   | ✅  | ✅  | ✅  | ✅  |
| list/CreateStocktakeModal.tsx                 | °   | ✅  | ✅  | 1   | 1   | ✅  | ✅  | °   | ✅  | ✅  | ✅  |
| list/listFilters.tsx                          | ✅  | ✅  | ✅  | ✅  | —   | ✅  | ✅  | ✅  | —   | ✅  | ✅  |
| list/actions/CreateInitialStocktakeAction.tsx | ✅  | ✅  | —   | ✅  | 1   | ✅  | ✅  | ✅  | ✅  | °   | ✅  |
| list/actions/DeleteStocktakesAction.tsx       | ✅  | ✅  | —   | —   | 1 ⚠ | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| list/actions/ExportStocktakesAction.tsx       | ✅  | ✅  | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | 1   |
| detail/StocktakeDetailView.tsx                | °   | 1   | 3   | ✅  | ✅  | 1   | °   | °   | °   | °   | 2   |
| detail/StocktakeDetailToolbar.tsx             | ✅  | 1   | 1   | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/StocktakeSidePanel.tsx                 | ✅  | ✅  | —   | ⚠   | ⚠   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/StocktakeStatusFooter.tsx              | ✅  | ✅  | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/stocktakeDetailFilters.tsx             | ✅  | —   | ✅  | ✅  | —   | ✅  | ✅  | ✅  | —   | ✅  | ✅  |
| detail/edit-modal/StocktakeLineEditModal.tsx  | 1 ⚠ | ✅  | 2   | 1   | ✅  | 1   | 1   | °   | ✅  | ✅  | 3   |
| detail/log/StocktakeLogPanel.tsx              | °   | ✅  | ✅  | —   | —   | 1   | °   | °   | ✅  | ✅  | ✅  |
| detail/actions/ChangeLocationAction.tsx       | ✅  | ✅  | —   | ✅  | 1   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/actions/CopyStocktakeAction.tsx        | ✅  | ✅  | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/actions/DeleteLinesAction.tsx          | ✅  | ✅  | —   | —   | 1 ⚠ | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/actions/DeleteStocktakeAction.tsx      | ✅  | ✅  | —   | —   | 1   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/actions/ExportPrintAction.tsx ¹        | ✅  | ✅  | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/actions/FinaliseAction.tsx             | ✅  | ✅  | —   | —   | 1   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/actions/ReduceToZeroAction.tsx         | ✅  | ✅  | —   | —   | 1 ⚠ | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/index.tsx                              | ✅  | ✅  | —   | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| detail/lines/stocktakeLine.ts                 | —   | —   | —   | —   | —   | —   | ✅  | 1   | —   | —   | —   |
| Spec docs (ui-surface.md / README.md)         | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | 2   |

¹ Since replaced by the shared `ExportPrintButton` in `@/domain/reports` (2026-09-21), which the detail view now mounts directly; the marks stand for the vertical's own copy as audited.

The remaining `.ts` logic files (`stocktakeEdit`, `stocktakeUpdate`, `stocktakeLineUpdate`, `stocktakeLineErrors`, `stocktakeStatus`, `stocktakesToCsv`, both filter modules) are ✅ on every applicable dimension — type derivation is textbook (every GraphQL-bound type derives from the generated fragments/variables; no parallel hand-written mirror), and no reactive-state pitfalls.

---

## REAL findings — code fixes

Each fix **climbs the reach-for order** and keeps composition explicit. Effort: S = one-liner, M = one screen, L = structural.

### R1 — Dialog-footer buttons don't follow D55 · dim 5 · **L (≈8 files)**

- **Rule:** `spec/ui-standards/controls.md:70` (D55): dialog footers are the icon-less `CancelButton` / `SaveButton` / `SaveAndNextButton` (and `OkButton` only for a genuine non-save "are you sure?"); **never** an icon, **never** "OK" for a save; the confirming action carries emphasis — **primary** by default, **danger** when destructive; Cancel stays secondary.
- **Problem:** every action/create modal except the line editor hand-rolls its footer as `<Button variant="…" icon={<…Icon/>}>`, and every destructive confirm is `variant="secondary"` (not `danger`). Instances: `CreateStocktakeModal.tsx:356-374`, `CreateInitialStocktakeAction.tsx:77-93`, `DeleteStocktakeAction.tsx:122-152`, `DeleteLinesAction.tsx:121-171`, `DeleteStocktakesAction.tsx:129-146`, `ReduceToZeroAction.tsx:154-172`, `ChangeLocationAction.tsx:152-170`, `FinaliseAction.tsx:164-184`.
- **Fix:** Cancel → `<CancelButton>` (icon-less). Non-destructive confirm (change location, finalise) → `<OkButton>` / `<DialogSaveButton>` (icon-less). Destructive confirm (delete stocktake/lines) → `<Button variant="danger">…</Button>` (icon-less — there is deliberately no danger StandardButton). Create confirm → `<Button variant="primary" loading={…}>{t('button.create')}</Button>` icon-less (spec S2/S2b say "Create", not "OK" — see spec edit note; this is the dim-11 impl-bug for the create label). Keep the existing `data-testid`s (`dialog-button-cancel`, `confirmation-modal-ok`, etc.) exactly.
- **Reference:** the already-correct `StocktakeLineEditModal.tsx:1423-1445`; `src/ui/elements/buttons/StandardButtons.tsx`.
- **Decisions needed:** (a) **Reduce-to-0** confirm — `primary` or `danger`? It is a bulk-destructive edit, not a delete (recommend `danger` for parity with the other destructive confirms, but it is your call). (b) Delete-confirm label — keep **"OK"** (D55 permits it for an "are you sure?") or relabel **"Delete"**? (recommend keep OK; danger variant already carries the destructive signal.) (c) The `DeleteLinesAction` error-phase **"Show error lines"** is a bespoke footer action (not Cancel/Save/OK) — recommend dropping its `SearchIcon` for D55 consistency, but it is borderline.

### R2 — The snapshot number cell: inline styles + dropped formatting · dims 1/3/4/6 · **M**

One bespoke cell, duplicated, with several dimensional defects and **one clean fix path**.

- **Where:** `StocktakeDetailView.tsx:640-670` (read-only detail lines table) and `StocktakeLineEditModal.tsx:881-912` (editable lines table).
- **Defects:** (dim 6/1) inline `style={{…}}` builds a flex column and styles the error text — an inline style is always a finding, and the code comment justifying it (`StocktakeDetailView.tsx:638`, _"a section owns no stylesheet"_) is factually wrong (this vertical already ships `StocktakeLineEditModal.module.css`). (dim 3) both cells spread `...getNumberCell()` then fully override `cell`, discarding the formatter — the number renders raw (no locale grouping / ≤2dp, though snapshots can be fractional). (dim 3) the modal renders `'—'` for null; empty cells MUST render blank ("a dash reads as data"). (dim 4) the read-only cell should present as a field with an `error` slot to match its editable sibling `countedNumberOfPacks`.
- **Fix — line editor (clean):** render the snapshot cell as `<NumberField disabled hideLabel size="small" value={line.snapshotNumberOfPacks} error={mismatch ? t('error.snapshot-total-mismatch') : undefined} errorTestId="stocktake-line-error" />`. This deletes **both** inline styles, gains locale formatting for free, renders blank when undefined, uses the native error slot (which already carries `stocktake-line-error`), and matches the editable counted-packs cell beside it. Confirmed: `NumberField` extends `TextField` and exposes `disabled`/`error`/`errorTestId`/`size`/`hideLabel`.
- **Fix — detail view (read-only table):** a disabled input in an otherwise plain read-only table would be inconsistent chrome, so keep a plain number cell but (a) format via `formatNumber(value, { maximumFractionDigits: 2 })`, (b) render blank (`''`) not raw, and (c) move the stacked-error markup off inline `style` into a **scoped CSS module** (`.snapshotCell` / `.lineError`, tokens only — rung 4; this folder currently has no module, which is fine to add), **or** adopt the shared cell helper below.
- **Boutique:** the "read-only number + optional inline line-error" composite has no library helper and is duplicated — a strong candidate for a shared `getNumberCell`-family fragment (an _errorable number cell_). See **Boutique / uncovered**. Surfaced, not built here.

### R3 — Doses-counted cell not formatted · dim 3/4 · **S**

- `StocktakeLineEditModal.tsx:1048-1051` renders `<span>{doses ?? ''}</span>` — a computed number bypassing `formatNumber` (same family as R2, lower stakes as doses are usually integers). Fix: format via `formatNumber`, or render `<NumberField disabled hideLabel size="small">` for consistency with R2.

### R4 — Expiry column loses the near-expiry warning · dim 3 · **S**

- `StocktakeDetailView.tsx:583` uses `...getDateCell()` for `expiryDate`, so it renders as a plain date and drops the near-expiry (≤3 months) red treatment. Fix: `...getExpiryDateCell()` (a bare drop-in for `getDateCell`, confirmed in `tableHelpers.tsx:140`). Highest-value one-liner; user-visible.

### R5 — Create-modal date field is a native input · dims 4/1 · **S**

- `CreateStocktakeModal.tsx:473` uses `<TextField type="date">` for "items expiring before" — the native browser date input rejected app-wide ([D26]; `inputs.md:73`). Fix: `<DateField>` (same value contract — a plain ISO `YYYY-MM-DD` string, so `dayBefore(expiryDate)` downstream is unaffected). Also the dim-11 S2 impl-bug (spec names the Date role).

### R6 — Manufacture-date field is unbounded · dim 4 · **S**

- `StocktakeLineEditModal.tsx:860` renders the manufacture `DateField` with no `max`, so future manufacture dates are selectable. `inputs.md:63` names manufacture date as _the_ example of a bounded field (future dates unselectable). Fix: add `max={localTodayIso()}` (import from `@/ui/elements/inputs/dateTimeConvert`), matching the showcase reference editor (`LineEditModal.tsx:609`). _In scope: a picker affordance the input standard mandates, not data-layer validation. Flagging because it changes which dates the calendar offers._

### R7 — Log-change cell hand-rolls a flex stack · dims 6/1 · **S**

- `StocktakeLogPanel.tsx:109` wraps the per-field change `<div>`s in `style={{ display:'inline-flex', 'flex-direction':'column', gap:'0.25rem' }}` — a layout inline style (C3) with a raw `0.25rem` (not a token). Fix: `<Stack gap="sm">`. **Decision:** `gap="sm"` = `--space-2` = 0.5rem vs the current 0.25rem — a small preset shift; accept it, or keep 0.25rem exact via a CSS-module class.

### R8 — `.selectPrompt` is a hand-rolled EmptyState · dims 1/6 · **S**

- `StocktakeLineEditModal.module.css` `.selectPrompt` (used at `StocktakeLineEditModal.tsx:1454`) is a centred, muted, small message shown in place of the batch table before an item is picked — exactly `EmptyState`'s plain-message mode. Fix: `<EmptyState graphic={false} message={t('messages.select-item-to-count')} />` and delete the class (confirmed: `EmptyState` takes `message` + `graphic={false}` for a plain centred message).

### R9 — Modal table `columns` should be `createMemo` · dim 7 · **S**

- `StocktakeLineEditModal.tsx:779` declares `columns` as a plain function passed to `DataTable`; the reactivity KDD §14 requires column arrays read by TanStack to be `createMemo` (the sibling detail view does this at `StocktakeDetailView.tsx:559`, citing a real slow-load bug). Not catastrophic — `DataTable` internally memoizes the mapped defs — but the caller's un-memoized `props.columns` reads (`hasFooter`, `sortableColumns`) rebuild per access. Fix: `const columns = createMemo((): Column<DraftLine, never, GroupKey>[] => [ … ]);`.

### R10 — Detail line-filters are in the page header, not the table toolbar · dims 3/2 · **L (structural)**

- **Rule:** `tables.md` § Toolbar (binding, "every table, list or detail"): the filter bar MUST render in the DataTable's own toolbar — never in the page header/app bar or a separate page-level band. Also `PAGES.md` § header field cluster: a detail header's editable meta field belongs in `HeaderToolbar`, not a hand-rolled `<Toolbar>` + `FieldRow`.
- **Problem:** `StocktakeDetailToolbar.tsx` packs three things into the page header's plain `<Toolbar>`: a status `Alert` (on-hold/finalised), the editable **description** (as `FieldRow` + `TextField hideLabel`), and the **line filters** (`FilterTextInput` item search + `FilterBar` chips). The detail `DataTable` (`StocktakeDetailView.tsx:927`) is handed no `filters` prop. The **list already does it correctly** (`StocktakesList.tsx:342`, `filters={<FilterBar…/>}`), so the detail is the internally-inconsistent outlier.
- **Fix:** move the line filters (item search + `FilterBar`) to the detail `DataTable`'s `filters` prop (mirror the list); render the editable description as a `HeaderToolbar` field (label-above, `size="small"`, full width); decide where the on-hold/finalised `Alert` banner sits (recommend: keep it as a page-level banner above the content). _Structural — needs your sign-off. Not contradicted by the spec (ui-surface.md does not pin filter placement); this is a pure-UI standard conformance, so the standard wins and the code moves._

### R11 — Detail lines table has no card model · dim 3 · **M**

- `StocktakeDetailView.tsx` declares no `cardGroups`, no column sets `cardGroup`, and only a `base` `columnVisibility` layer (no `compact`). Below 600px (always card) the phone card renders ~18 columns flat with no "More details" disclosure. Fix: declare `cardGroups` with a collapsed "More details" group and route secondary columns via `cardGroup` (as `DetailTableShowcase.tsx:92` does for this exact table shape), and/or add a `compact` `columnVisibility` default. The list table (5 columns) is fine flat — not flagged.

### R12 — One `as number` cast in screen logic · dim 8 · **S (low-sev)**

- `detail/lines/stocktakeLine.ts:28` — `(line.countedNumberOfPacks as number) - …`. Guarded by `isUncounted`, but the cast is an avoidable type hole in non-trusted code (the only genuine screen-code `as` in the vertical). Fix: narrow via a local const (`const counted = line.countedNumberOfPacks; return counted == null ? null : counted - (line.snapshotNumberOfPacks ?? 0);`). Behaviour-preserving.

---

## Decisions needed (your call)

These are judgment items where the audit found a genuine tension, not a clear-cut violation.

- **J1 — Side-panel read-only facts** (`StocktakeSidePanel.tsx:51-56`, dims 4/5). "Entered by" / "Created" are rendered as `FieldRow` + `<Text>` rather than `LabelledValue variant="card"`. Three references say read-only facts use `LabelledValue` — the dim-5 rule, the `SidePanel` showcase (`<dl>` of dt/dd), and **your own stated preference** ("never-editable facts as `LabelledValue`, not `FieldRow`/`hideLabel`"). **But** the in-file comment (`:48-50`) documents a _deliberate_ choice: one shared label column so the read-only facts line up with the editable inputs (Counted by / Verified by / Comment) below them. The showcase has no precedent for _editable_ fields in a side panel, so this mixed case is genuinely uncovered. **Options:** (A) read-only facts → `LabelledValue variant="card"`, accepting label-above misalignment with the editable rows below; (B) keep the deliberate `FieldRow` alignment and record a documented exception in `DIVERGENCES.md`. Recommend **A** unless the alignment is a hard requirement.
- **J2 — Bulk-delete trigger tone** (`DeleteLinesAction.tsx:54`, `DeleteStocktakesAction.tsx:49`, dim 5). The two selection-footer **trigger** buttons are `variant="secondary"`, whereas the single-record delete and the line-editor delete-batch use `danger`. "delete = danger" argues for `danger`; the selection footer's uniform "blue tone" argues for keeping `secondary`. Your call. (This is separate from the delete-_confirm_ buttons in R1, which are clearer.)
- **J3 — `.addTitle` cleanup** (`StocktakeLineEditModal.module.css`, `:1386`, dim 1). A hand-rolled flex row wrapping a **single** `ItemSearch` in the Dialog title slot; the `gap` is inert with one child. The load-bearing bits (`font-weight` reset, `inline-size:100%`, the child's `max-inline-size` cap) are legitimate rung-4 CSS. **Options:** drop the `display:flex`/`gap`/`align-items` (single child needs none) and keep the weight + width caps; or switch to `HStack`. Minor; skip if not worth the churn.

---

## Spec edits (dim 11) — for your sign-off

Per the skill, spec edits are consequential and are **never made silently**. All of these resolve _pure-UI_ drift where the reference vertical's code is the current-correct UI and the spec is stale, so the **spec is updated to match** (standards/reference win) — following `spec/AUTHORING.md` (name roles, never components/CSS; present tense; no history). Two have a direction choice.

- **SE1 — Blind stocktake is built; the spec says it isn't.** `ui-surface.md:7` + `README.md` status still call it "not yet read here … a gap," but the code reads `stocktakePreferences().blindStocktake` everywhere the S2/S3/S4 bodies specify. **Highest value** — a `spec-build` reading the caveat would regress. Fix: delete the stale clause; state it present-tense as an implemented, preference-gated behaviour.
- **SE2 — The four "P1-feedback" items are built; README says not.** `README.md:102` lists icon-less save (D55), `DateField` dates (D56), Location-on-Batch (D57), doses fallback (D58) as "not yet built" — all four exist. Fix: remove the stale bullet.
- **SE3 — Location column sort** (S3 table, `ui-surface.md:129`). Spec marks Location not-sortable; code sets `sortKey: 'locationCode'`, a real server sort key. **Direction choice:** update spec to Sortable = yes (recommended — the sort works and is reference-correct), _or_ remove `sortKey` in code to match OMS exactly.
- **SE4 — Bulk-action bar order** (S3, `ui-surface.md:156,167`). Spec says Reduce-to-0 · Change-location · Delete; code renders Delete · Change-location · Reduce-to-0. **Direction choice:** reorder the spec to match the reference code (recommended; cosmetic, no behavioural rationale), _or_ reorder the code to match the spec.
- **SE5 — Line-editor title** (S4, `ui-surface.md:181`). Spec says "titled with the mode and item (Add item / Edit line)"; the code deliberately makes the title bar _be_ the item selector (one combined add/edit flow, no mode word). Fix: reword S4 to describe the title as the item selector.
- **SE6 — Batch/Pricing/Other surface** (S4, `ui-surface.md:183`). Spec names "modal-level tabs"; the code uses the shared data table's grouped **card model** (Batch panel + Pricing/Other disclosures, card-only, no tab strip). The named role doesn't resolve to the component used. Fix: re-describe as the data-table grouped card model (keeps the registry's "modal tabs not yet exercised" note accurate).
- **SE7 — Line-editor "Unit" display** (S4, `ui-surface.md:181`). Spec's item row names "a read-only Unit display"; the code has none. **Direction choice:** drop the mention (recommended — the reference omits it), _or_ build the Unit display.
- **SE8 — S1 export label** (S1, `ui-surface.md:46`). Spec says "Export CSV"; the impl is a CSV/Excel `SplitButton` (which the spec's own intro already acknowledges). Fix: relabel "Export (CSV/Excel)".

Any of SE5–SE8 that diverge from the reference OMS app should also get a one-line `spec/DIVERGENCES.md` entry.

---

## Boutique / uncovered elements

- **Errorable number cell** — the "read-only number + optional inline line-error" composite (R2/R3), duplicated in the detail table and the line editor. No library helper covers it. **Tag (a): candidate new library component** — a `getNumberCell`-family fragment that reuses the number formatter and takes an optional error message, replacing both copies. This is its own task under `ADDING_A_COMPONENT.md`; **surfaced here, not built in this migration.** Until/unless it exists, the in-scope fix is per R2 (NumberField in the modal; formatNumber + scoped CSS module in the detail view — **tag (c): documented bespoke cell**).

---

## Benign / consistency / optional (noted, low priority)

- **B1 (dim 7)** `StocktakeLogPanel.tsx:156` — `columns` plain function → `createMemo` for consistency (impact negligible; no footer/sortable columns).
- **B2 (dim 7)** `StocktakeLineEditModal.tsx:521` — `rows = () => draft.filter(…)` returns a fresh array to DataTable; benign (editing a count doesn't remount the row — focus is preserved), `createMemo` optional for reference-stability.
- **B3 (dim 7)** `.latest`-alone value reads (`StocktakeDetailView.tsx:273,305`; `StocktakesList.tsx:176,203`). Verified **safe** (these first-fetch on load, under a spinner; interaction refetches read a populated `.latest`, so no open form/modal/focus is ever lost). But they diverge from the KDD's `.state`-gate letter that `CreateStocktakeModal` follows. Recommend standardizing on the `.state` gate so the reference vertical exemplifies the pattern — consistency, not a live bug.
- **B4 (dim 10)** `StocktakeDetailView.tsx:876` — the detail selection `ContentFooter` has no `testId="actions-footer"` (the list's does; TESTIDS.md documents the shared id). Nothing breaks today. Optional consistency.
- **B5 (dim 10)** `CreateInitialStocktakeAction.tsx` — the initial-create dialog + its buttons carry no testids. No contract gap today. Optional, if that path is ever brought under the deterministic suite.
- **B6/B7 (dim 3)** code/batch/location columns aren't monospace and no column carries `getCellDefinition` width presets. This is a **tracked cross-cutting rollout gap** (`CELL_TYPES.md` § Delivery status: presets are showcase-only; vertical tables unchanged), not a stocktakes defect. **Decision:** since stocktakes is the reference vertical, adopt `getCellDefinition('itemCode'|'batch'|'location')` now, or defer with the rollout.
- **B8 (dim 3)** minor helper-usage nits: the counted column re-declares `meta` instead of `getNumberCell({ headerPosition: 'badge' })`; the modal's editable cells spread a redundant `getNumberCell` before overriding `cell`; price columns use `getNumberCell` where `getCurrencyCell` reads truer (all cosmetic — the `cell` is overridden).

---

## Proposed fix order (linear, if you approve)

Small, reviewable diffs, one screen at a time. Suggested sequence:

1. **Clear-cut one-liners:** R4 (expiry cell), R5 (DateField), R6 (manufacture max), R7 (log Stack), R8 (EmptyState), R9 (columns memo), R12 (cast).
2. **The snapshot cell (R2/R3):** line editor first (NumberField), then detail view (formatNumber + CSS module) — unless you approve building the shared helper (Boutique), in which case that becomes the fix.
3. **D55 footers (R1):** the ~8 modals, once you've settled J2/J4 and the label question.
4. **Structural (R10, R11):** detail toolbar/filter placement and the card model — after sign-off.
5. **Spec edits (SE1–SE8):** applied to the spec docs per your direction choices, with `DIVERGENCES.md` entries where needed.

## Verify plan

- `pnpm check` (types, stylelint, theme contract, page-CSS guard, browser floor) + `pnpm test` green.
- `check-reactivity` run on the resulting working-tree diff (the skill's reactivity delegate — it reviews the _changes_, so it runs after the fixes, not on the untouched code).
- **Your visual pass** (the skill cannot sign this off): each migrated screen in **light and dark**, compared against its showcase page + the stocktakes reference — the detail view (`#/showcase/table`, `#/showcase/detail-views`), the line editor (`#/showcase` LineEditModal), the header/toolbar (`#/showcase/header`), the side panel (`#/showcase/side-panel`), and every dialog footer.
