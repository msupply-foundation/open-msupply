# Locations — UI migration audit report

**Status: MIGRATION APPLIED — one item awaits your decision.** All six code findings (R1–R6) are fixed and both spec edits (SE1, SE2) are applied; `pnpm check` and `pnpm test` (869 tests) are green and `check-reactivity` on the resulting diff came back clean. Still open: **F7** — a fullness-suppression rule stricter than the spec's own behaviour case, found while answering "what is this fullness column?". The audit findings below are kept as the record of what was found and why.

## Outcome

### Code fixes — all applied, all green

| Finding                        | Resolution                                                                                                                                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 · filter placement          | `FilterBar` moved to the `DataTable`'s `filters` prop; the header's `<Toolbar>` (and its import) dropped — the header is now `Breadcrumb` + `HeaderButtons`, like the reference                                                                                                          |
| R2 · D55 dialog footers        | modal → icon-less `CancelButton` / `DialogSaveButton` / `SaveAndNextButton` (**Cancel · Save · Save & next**, matching `ui-surface.md` S2); delete dialog → `CancelButton` + icon-less **danger** confirm, icon-less Close on the report                                                 |
| R2b · delete tone (your call)  | **every delete is danger** — the selection-footer trigger and the confirm both `variant="danger"`                                                                                                                                                                                        |
| R3 · On hold column            | `getBooleanCell({ display: 'dot', label: t('label.on-hold') })` + `size` — the registered `BooleanCell` role, stale "not built" comment removed                                                                                                                                          |
| R4 · column widths             | `getCellDefinition('code')` (mono + preset) and `getCellDefinition('name', { headerPosition: 'primary' })`; `locationType` / `volume` / `volumeUsed` keep their explicit helper with a call-site `size: remToPx(…)`                                                                      |
| R5 · `.volumeRow`              | `FormRow`; **`LocationEditModal.module.css` deleted** — the vertical now owns no CSS at all                                                                                                                                                                                              |
| R6 · imports (your call)       | all 57 cross-vertical imports rewritten to the `@/` alias; zero relative `../../../` left                                                                                                                                                                                                |
| SE1 · export label             | `ui-surface.md` S1 page actions → **Export (CSV/Excel, download icon)**                                                                                                                                                                                                                  |
| SE2 · registry row (your call) | `components.md` § Tables gains a ⛔ **Proportion cell (fullness bar)** row — the role, its a11y requirement, its one consumer (the locations list **Volume used** column), and the text interim until it is built; `ui-surface.md` column 5's type now links to it, so the role resolves |

Every `data-testid` is byte-identical, so the deterministic suite's contract is untouched.

### Post-audit tweak (yours, on inspection)

- **T1 — the modal's On hold toggle filled the row.** `CheckboxButton` is `display: inline-flex`, but `Dialog`'s `.body` is a flex column with the default `align-items: stretch`, so it was stretched to full width. Wrapped in an `HStack`, which keeps its intrinsic width without page CSS (its five status-footer uses never hit this because they already sit in a row). The **pill border is the component's identity**, not a defect: `CheckboxButton` is the registry's [text-toggle role](../../../spec/ui-standards/components.md#buttons--status) and the counterpart of the current app's bordered `ToggleButton`, which the reference location modal also renders shrink-to-content.

### Still open — your decision (one item)

- **F7 — the list suppresses fullness more often than the spec allows.** [LocationsList.tsx:53-58](list/LocationsList.tsx#L53-L58) reads `getVolumeUsedPercentage`, which returns `undefined` when capacity is `0` **or** when the location holds stock whose `volumeUsed` is `0`. Behaviour case **`.31`** says only _"A location with a non-zero volume shows its fullness as used ÷ capacity; at zero volume no proportion is shown"_, and the current app's list computes `(volumeUsed || 0) / volume` inline and renders a **0% bar** ([open-msupply ListView.tsx:86-88](../../../../open-msupply/client/packages/system/src/Location/ListView/ListView.tsx#L86-L88)) — it never consults the picker's helper. So a location with capacity but volume-less stock lines reads **0%** in the current app and **blank** here. Spec-owned behaviour ⇒ the spec wins ⇒ the implementation is wrong, but the stricter rule is pinned by [volumeDisplay.test.ts:32-34](list/volumeDisplay.test.ts#L32-L34) as `.31`, so it is surfaced rather than changed silently. Options: (A) show `0% used` whenever capacity > 0 (fixes the column being invisible on the reference datafile; touches `fullnessLabel` + that test); (B) keep the stricter rule as deliberate → update case `.31` + the shared-helper comment and add a `DIVERGENCES.md` entry; (C) defer as its own issue.

## Scope & method

- **Scope:** the whole `locations` vertical — the route tree, the list screen, the create/edit modal, the two list actions, the filter definitions, and the five pure-logic modules. Locations has **no detail screen, no side panel, no tabs, no line editor**: a row click opens the S2 modal.
- **References used:** the eleven dimensions in [`MIGRATING_A_VERTICAL.md`](../../ui/docs/MIGRATING_A_VERTICAL.md); the [registry](../../../spec/ui-standards/components.md); the reference vertical `src/sections/stocktakes/` **in its post-migration state** (its own [report](../stocktakes/ui-migration-report.md) settles several of the same questions, so the precedents are cited rather than re-derived); `spec/locations/ui-surface.md`; `e2e/TESTIDS.md` + `e2e/specs/locations-regression.spec.ts`.
- Every candidate was re-read in context before it became a finding; library APIs (`getBooleanCell`, `getCellDefinition`/`CELL_DEF`, `FormRow`, `StandardButtons`, `Dialog` body rhythm) and the D55 rule text were confirmed at source.

## Headline

The vertical is in **good shape structurally** — no inline `style`, no colour or px literals, `Page`/`Header`/`DataTable`/`Dialog` composition, textbook GraphQL-derived types, a correct `.state`-gated resource read in the modal, and testids that match the shared contract exactly. The work is **four real clusters**, all mechanical:

1. **The filter bar sits in the page header**, not the table's own toolbar — a _binding_ `tables.md` rule the list already-migrated reference obeys. Most structural of the four.
2. **Dialog footers predate D55** — icon-bearing `Button`s labelled "OK" / "OK & next", and a destructive confirm rendered `secondary`. The spec's own S2 layout already says **Cancel · Save · Save & next**, so this is also an impl-vs-spec bug.
3. **Two table cells are hand-rolled or unsized** — the On hold column renders the translated label as text (its "not built" comment is stale: `BooleanCell`/`getBooleanCell` exists and is the registered role), and no column carries a width preset.
4. **One CSS module hand-rolls a flex row** that `FormRow` is exactly for.

Plus one convention gap (`@/` imports) and two spec edits.

## Coverage table — after the migration

Every cell green except the one open item above (F7, on the list's dim 11); `°` marks the benign/optional notes at the foot of this report, which were deliberately left.

| Screen / file                          | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  |
| -------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.tsx                              | ✅  | ✅  | —   | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| list/LocationsList.tsx                 | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | °   | ✅  | ✅  | ✅  | F7  |
| list/LocationEditModal.tsx             | ✅  | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| list/actions/DeleteLocationsAction.tsx | ✅  | ✅  | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| list/actions/ExportLocationsAction.tsx | ✅  | ✅  | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| list/listFilters.tsx                   | ✅  | —   | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| logic modules (5 `.ts`)                | —   | —   | —   | —   | —   | —   | ✅  | ✅  | —   | —   | ✅  |
| Spec docs (`ui-surface.md`, registry)  | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | ✅  |

The vertical now owns **no CSS**, no inline `style`, no colour/px literals, no hand-rolled layout, and no relative cross-vertical imports.

---

## Coverage table as audited (before the fixes)

Legend: ✅ clean · _n_ = REAL findings · ° = benign / consistency / optional · — = N/A.

Dimensions: **1** C3/registry · **2** composition · **3** tables · **4** inputs · **5** forms/dialogs · **6** styling · **7** reactivity · **8** types · **9** a11y · **10** test hooks · **11** spec.

| Screen / file                          | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  |
| -------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.tsx                              | ✅  | ✅  | —   | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| list/LocationsList.tsx                 | 1 ° | 1   | 3   | ✅  | ✅  | ✅  | °   | ✅  | °   | ✅  | 2   |
| list/LocationEditModal.tsx (+ .css)    | 1 ° | —   | —   | ✅  | 1   | 1   | ✅  | ✅  | ✅  | ✅  | 1   |
| list/actions/DeleteLocationsAction.tsx | °   | ✅  | —   | —   | 1   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| list/actions/ExportLocationsAction.tsx | °   | ✅  | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | 1   |
| list/listFilters.tsx                   | ✅  | —   | ✅  | ✅  | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| logic modules (5 `.ts`)                | —   | —   | —   | —   | —   | —   | ✅  | ✅  | —   | —   | ✅  |
| Spec docs (`ui-surface.md`, registry)  | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | 2   |

The `°` in column 1 on every `.tsx` is R6 (the `@/` alias), counted once as a vertical-wide item. The logic modules (`locationEdit`, `listState`, `locationTypeLabel`, `locationsToCsv`, `deleteLocations`) are clean on every applicable dimension — every GraphQL-bound type derives from the generated variables/results, there is no parallel hand-written mirror, and there are **no `as` casts** anywhere in the vertical.

---

## REAL findings — code fixes

Effort: S = one-liner · M = one screen · L = structural.

### R1 — The filter bar renders in the page header, not the table toolbar · dims 3/2 · **M**

- **Rule:** [`spec/ui-standards/tables.md:13`](../../../spec/ui-standards/tables.md) (binding, "every table, list or detail"): the filter bar MUST render in the table toolbar — _never_ in the page header / app bar, and never in a separate page-level band. It explicitly _overrides any vertical spec that places filters elsewhere_.
- **Problem:** [LocationsList.tsx:213-219](list/LocationsList.tsx#L213-L219) wraps `FilterBar` in the `Header`'s `<Toolbar>`; the `DataTable` is handed no `filters` prop.
- **Fix:** move the `FilterBar` to the `DataTable`'s `filters` prop; drop the `Toolbar` import and the header's `<Toolbar>` element. The header then reads `Breadcrumb` + `HeaderButtons`, exactly like the reference.
- **Reference:** [StocktakesList.tsx:343-349](../stocktakes/list/StocktakesList.tsx#L343-L349); this is the same fix as the reference vertical's R10, applied to a list instead of a detail.
- **Risk:** none for the deterministic suite — `locations-regression.spec.ts` reaches the filters through `filters-menu` / `filter-option-<key>` / `filter-input-<key>`, all emitted by `FilterBar` wherever it is mounted.

### R2 — Dialog footers don't follow D55 · dim 5 (+ dim 11 for the modal) · **M**

- **Rule:** [`controls.md` § Footer button identity](../../../spec/ui-standards/controls.md) (D55) and registry row _Modal footer button_: a footer is the icon-less `CancelButton` / `DialogSaveButton` / `SaveAndNextButton` (`OkButton` only for a genuine non-save "are you sure?"); **never** an icon; **never** "OK / OK & next" for a save; the confirming action carries the emphasis — **danger** when destructive, Cancel stays secondary.
- **Problem (a) — the S2 modal**, [LocationEditModal.tsx:233-267](list/LocationEditModal.tsx#L233-L267): three hand-rolled `Button`s with `XCircleIcon` / `CheckIcon` / `ArrowRightIcon`, labelled `button.ok` and `button.ok-and-next`. `spec/locations/ui-surface.md:72` already specifies **Cancel · Save · Save & next**, and its validation prose calls them _Save_ and _Save & next_ — so the labels are an implementation bug against the spec, not a spec drift.
- **Problem (b) — the delete action**, [DeleteLocationsAction.tsx:187-223](list/actions/DeleteLocationsAction.tsx#L187-L223): Cancel is a hand-rolled icon-bearing `Button`; the **destructive confirm is `variant="secondary"`** with a `TrashIcon`; the report's Close carries a `CheckIcon`.
- **Fix:** modal → `<CancelButton data-testid="dialog-button-cancel">`, `<DialogSaveButton data-testid="dialog-button-ok">`, `<SaveAndNextButton data-testid="dialog-button-next-and-ok">` (all icon-less; `loading`/`disabled` pass straight through). Delete action → `<CancelButton>`; confirm → `<Button variant="danger" data-testid="confirmation-modal-ok">{t('button.ok')}</Button>` icon-less (D55 permits "OK" for an are-you-sure); report dismissal → icon-less `<Button variant="secondary">{t('button.close')}</Button>` ("Close" is the right word here, so a plain `Button` over `CancelButton`). **Every `data-testid` stays byte-identical.**
- **Reference:** [DeleteStocktakesAction.tsx:127-146](../stocktakes/list/actions/DeleteStocktakesAction.tsx#L127-L146) (the post-migration shape).
- **Decision (recommend yes):** the selection-footer **trigger** `delete-lines-button` is `variant="secondary"` here; the reference now renders it `danger` ([DeleteStocktakesAction.tsx:49](../stocktakes/list/actions/DeleteStocktakesAction.tsx#L49)) following your call in that migration. Applying the same keeps the two lists consistent.
- **Doc ripple:** `e2e/TESTIDS.md:159` describes these as "the modal's OK / Cancel / OK & Next". The ids don't change; the prose names the current app's labels too, so I'd leave it unless you want it reworded.

### R3 — The On hold column hand-rolls the boolean cell · dims 1/3/9 · **S**

- **Rule:** registry row _Boolean cell (flag in a table)_ → `BooleanCell` **✅ built**; `getBooleanCell` is its column form. `ui-surface.md:36` specifies a **presence marker** (shown when on hold, blank otherwise) exposing the state accessibly.
- **Problem:** [LocationsList.tsx:178-187](list/LocationsList.tsx#L178-L187) uses an accessor returning `t('label.on-hold')` or `''` — i.e. the label text _as the cell value_ — and its comment asserts "the registry's dedicated boolean-cell component is not built". That is **stale**: `src/ui/elements/table/BooleanCell.tsx` exists, is registry-✅, and its dot marker already carries the accessible name (D8) this comment was working around.
- **Fix:** `{ c: { key: 'onHold' }, header: () => t('label.on-hold'), ...getBooleanCell({ display: 'dot', label: t('label.on-hold') }), size: remToPx(4) }`, and delete the stale comment.
- **Reference:** [PrescriptionLineEditModal.tsx:518](../prescriptions/detail/edit-modal/PrescriptionLineEditModal.tsx#L518) — the same `dot` + `label.on-hold` pairing.
- **Visible change:** a centred dot replaces the repeated words "On hold" down the column. This is what the spec asks for and matches the reference app.

### R4 — No column carries a width preset · dim 3 · **S**

- **Rule:** the skill's table dimension: number / code / id columns take `getCellDefinition('<key>')` — a bare helper sets **no `size`**, so the column renders at a wrong default width and resizes badly. Widths live in [`_globalColumnConfig.ts`](../../ui/elements/table/_globalColumnConfig.ts) (`CELL_DEF`/`KIND_WIDTH`), documented in [`CELL_TYPES.md`](../../ui/docs/CELL_TYPES.md).
- **Problem:** [LocationsList.tsx:143-188](list/LocationsList.tsx#L143-L188) — `code` and `name` carry no fragment at all; `volume` and `volumeUsed` spread a bare `getNumberCell()` (rendering + align, no width); `locationType` carries nothing.
- **Fix:** `code` → `...getCellDefinition('code')` (mono, 5rem / 7rem cap); `name` → `...getCellDefinition('name')` (18.75rem text sink, keeping `meta: { headerPosition: 'primary' }` via the second arg). `volume` / `volumeUsed` / `locationType` have **no `CELL_DEF` key**, so per `CELL_TYPES.md` they keep the explicit helper and set the width at the call site: `...getNumberCell(), size: remToPx(7)` for `volume` ("Volume (m³)" is the binding header), `size: remToPx(7.5)` for `volumeUsed`, and `...getTextCell(), size: remToPx(14)` for `locationType`.
- **Note:** `getCellDefinition('code')` makes location codes **monospace** — intended by the preset ("code-like fields where fixed-width glyphs align better"), and a visible change worth eyeballing.
- **Library follow-up (not this migration):** adding `volume` / `volumeUsed` keys to `CELL_DEF` would be the "one place widths live" home for them. Only one other vertical shows a `label.volume` column today, so it's marginal — flagged below, not done here.

### R5 — `.volumeRow` hand-rolls a flex row `FormRow` owns · dims 1/6 · **S**

- **Rule:** reach-for order rung 2 over rung 4 — [`FormRow`](../../ui/layout/Form/FormRow.tsx) is the library's two-up field row ("the _two-up row_ a FormSection reaches for on the specific rows that pair, e.g. Expiry / Manufacture date"), wrapping intrinsically to stacked. A page CSS module is only for what no component covers.
- **Problem:** [LocationEditModal.module.css:4-8](list/LocationEditModal.module.css#L4-L8) declares `display:flex; gap; align-items` for the Volume / Volume used pair, used at [LocationEditModal.tsx:307](list/LocationEditModal.tsx#L307). Tokens-only and honest, but it re-implements `FormRow` exactly.
- **Fix:** `<FormRow>` around the two `NumberField`s; delete `LocationEditModal.module.css` (+ its generated `.d.ts`) and the `styles` import — the vertical then owns no CSS at all.
- **Change in effect:** gap goes `--space-4` → `--space-3 --space-4` (row/column), `align-items: flex-start` → `start` (identical), and each field gains `flex: 1 1 10rem` + wrap-to-stacked, which the current row lacks. Vertical rhythm around it is already correct — `Dialog`'s `.body` stacks children with `gap: var(--space-4)`.

### R6 — Cross-vertical imports don't use the `@/` alias · dim 1 (convention) · **S, mechanical**

- **Rule:** root `CLAUDE.md` § Imports — `@/` for imports that leave a vertical (`@/ui/...`, `@/api/graphql`, `@/intl`, `@/domain/location`), relative only within the vertical.
- **Problem:** 54 `../../../`-style cross-vertical imports across the six `.tsx`/`.ts` files.
- **Context:** repo-wide gap, not a locations defect — `stocktakes` is fully converted (200 aliased imports, 0 relative); `items`, `stock`, `master-lists` are all still relative. Zero behavioural risk, but it is churn in every file.
- **Your call:** fold it into this migration (locations becomes the second conforming vertical), or leave it to a repo-wide sweep. **Recommend: do it** — the diff is already touching all but one of these files.

---

## Spec edits (dim 11) — for your sign-off

Both are **pure-UI** drift, so per the skill the standards/registry win and the _spec_ is updated. Written per `spec/AUTHORING.md` (roles not components, present tense, no history).

- **SE1 — S1 export action label.** `ui-surface.md:41` says "**Export** CSV (download icon)"; the implementation is a CSV **or Excel** split button ([ExportLocationsAction.tsx](list/actions/ExportLocationsAction.tsx), OMS-REG-INV-01.11). Same drift, same fix as the reference vertical's SE8: relabel to **Export (CSV/Excel)**.
- **SE2 — the "proportion bar" role does not exist in the registry.** `ui-surface.md:35` types column 5 as a **proportion bar**, and the Cross-cutting bullet calls it "the fullness bar". [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md) has **no row for it** — so the role can't be resolved to a component (or to a ⛔ backlog entry), and the implementation silently renders percentage text instead ([LocationsList.tsx:171-177](list/LocationsList.tsx#L171-L177)). The spec is entitled to name an unbuilt role ("a screen MAY specify a ⛔ role"), so the fix is on the **registry** side: add a **⛔ row** — _Proportion / fullness bar (in a table cell)_ — describing the role (a value ÷ capacity fill, blank when capacity is `0`, read-only, meaning never by colour alone), which flips to ✅ when built. `ui-surface.md` then needs no change.
  Two sub-decisions: (a) confirm the ⛔ registry row wording is yours to approve — it is an edit to a source-of-truth doc; (b) the current percentage text is then a **documented interim** for a ⛔ role, which is legitimate, but if you'd rather the interim be recorded as a deliberate difference from the reference app, that's a one-line [`DIVERGENCES.md`](../../../spec/DIVERGENCES.md) entry. Not added speculatively.

No **behaviour/content/gating** conflicts were found: the modal's field order, requiredness, clearability, save-and-next semantics, delete confirm → in-use report, store scoping, and the never-editable volume-used all match `rules.md`/`acceptance.md` as implemented. The one content mismatch (footer labels) is the _implementation_ being wrong — fixed by R2, not by editing the spec.

---

## Boutique / uncovered elements

- **The fullness (proportion) bar** — the only element in the vertical that does not map to a library component. **Tag (b): a registry role awaiting a build** (once SE2 adds the row), and **tag (a): a candidate new library component** — a `getCellDefinition`-family fragment rendering a value ÷ capacity fill with an accessible text equivalent, which the volume-aware location picker could share. Filed as [#740](https://github.com/msupply-foundation/open-msupply-frontend/issues/740) with the [`ADDING_A_COMPONENT.md`](../../ui/docs/ADDING_A_COMPONENT.md) checklist; **deliberately not built here** — a migration doesn't smuggle in library components. Interim: the existing percentage text (`t('label.percent-used')`), which is accessible — though **when** it shows is itself unresolved, see F7. _Since built as `ProportionCell` (#740) and adopted by the column; the interim text is gone, F7 still open._

## Library findings surfaced

Nothing behavioural — the vertical exercises `DataTable`, `FilterBar`, `Combobox`, `Dialog`, and `CheckboxButton` in contexts they were built for. Two **gaps** (both additive, both out of this migration's scope):

- **`CELL_DEF` has no `volume` / `volumeUsed` keys** (R4) — worth adding when a second vertical needs them; page-level `size` is the sanctioned interim. _Since resolved for `volumeUsed`_ (it carries the new `proportion` cell kind — #740); `volume` still sets its `size` at the call site.
- **No proportion-bar cell** — filed as [#740](https://github.com/msupply-foundation/open-msupply-frontend/issues/740). _Since built_: `ProportionCell` + `getProportionCell`, adopted by the Volume used column, so the percentage-text interim below is gone. F7 is untouched — the cell renders the proportion the vertical's shared helper derives, suppression rule included.

## Benign / consistency / optional (noted, not fixed unless you say so)

- **B1 (dim 7)** `columns` is a plain accessor, not a `createMemo` ([LocationsList.tsx:143](list/LocationsList.tsx#L143)). Identical to the reference list; the reactivity KDD's §14 memo rule was applied to the reference's _modal_ table, not its list. Consistency only.
- **B2 (dim 7)** `.latest`-alone reads at [LocationsList.tsx:112-113](list/LocationsList.tsx#L112-L113). Verified safe (first fetch is the screen's own load, under the table's spinner; nothing live to lose) and identical to the reference's B3. The modal's own resource correctly uses the full `.state` gate. Standardising both on the `.state` gate is the KDD's letter — recommend it _only_ if the reference is converted at the same time.
- **B3 (dim 3)** no `cardGroups`: the compact card shows all six columns flat, with `name` as the card title and no badge. Fine at six columns (the reference list is five, also flat). `onHold` would be the natural `header-badge` if you want one — cosmetic.
- **B4** the comment at [LocationsList.tsx:173](list/LocationsList.tsx#L173) cites a `BUILD_REPORT` that **does not exist** anywhere in the repo (six other sections cite it too — a cross-cutting dangling reference). The R3/R4 edits touch these comments anyway; I'd drop the citation here and leave the rest.
- **B5 (dim 10)** the on-hold toggle and location-type picker carry no shared-suite testid — deliberate per `TESTIDS.md:168` (covered by colocated tests). No gap.

---

## Fix order as applied

R3 + R4 (columns, dropping B4's dangling `BUILD_REPORT` citation) → R1 (filters into the table toolbar) → R5 (`FormRow`, CSS module deleted) → R2 (both dialog footers, all deletes `danger`) → R6 (the `@/` sweep) → SE1 (spec export label). B1/B2/B3/B5 left as noted — each is either identical to the reference vertical or cosmetic.

## Verification

- `pnpm check` — green (CSS-module types, `tsc -b`, stylelint, theme contract 65 tokens, page-CSS guard, Chromium 138 floor).
- `pnpm test` — green, 94 files / 869 tests.
- `check-reactivity` on the working diff — **clean**. The `StandardButtons` wrappers spread `{...props}` into `Button`, so `loading`/`disabled` stay lazy getters; `filters={<FilterBar …/>}` is read once and `filter={query().filter}` remains FilterBar's own lazy prop; `getBooleanCell(t(…))` + the `remToPx` widths re-derive when `columns()` re-runs in its tracking scope (so a language switch still re-labels).

## Your visual pass (required — the skill cannot sign this off)

Open the list at `#/{storeId}/inventory/locations` and the create/edit modal in **light and dark**, against `#/showcase/table`, `#/showcase/header`, `#/showcase/forms`, and the stocktakes list:

- **Column widths + drag-resize** (R4) — six columns, and location codes now render **monospace** (the `code` preset).
- **On hold** (R3) — a centred dot replaces the repeated words "On hold" down the column.
- **Filter chips** (R1) — now inside the table's own toolbar, not the page header; shrink-to-content, one clear affordance.
- **The modal's Volume / Volume used row** (R5) — wraps to stacked on a narrow dialog; check the gap against the fields above it.
- **Dialog footers** (R2) — icon-less **Cancel · Save · Save & next**; the delete trigger, the delete confirm, and nothing else are red.
- **Empty state** — unchanged (the ghost "Create a new one" button).
- **The Volume used column** — expect it blank on most reference-datafile rows until F7 is decided.

Anything that looks wrong in the shared `DataTable` / `FilterBar` / `Combobox` chrome is a **library** task, not a locations one — capture it separately.
