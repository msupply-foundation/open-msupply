# Issue #550 — UI Library Gap Audit: Progress Tracker

Tracking doc for [#550](https://github.com/msupply-foundation/open-msupply-frontend/issues/550). Not for commit — working scratchpad across sessions.

**Progress legend:** ⬜ Not started · 🔵 In progress · ✅ Done · ⏭️ Skipped/won't-do · ❓ Needs decision

---

## Workflow (per item — follow this every session)

For each item we tackle, work in three steps and pause for Carl between them:

1. **Evidence** — show 1–2 concrete call sites that the new/shared component will replace (real file + line refs, ideally the actual markup/logic). This anchors what "done" means before writing anything.
2. **Implement** — build the component/extraction and swap the identified sites over to it. Keep JSX explicit per the KDDs; extract logic, not markup, unless the item is explicitly a primitive.
3. **Review** — re-read the diff for correctness, reactivity pitfalls (`kdd/solid-reactivity-pitfalls`), bundle cost, and adoption completeness; run `pnpm check` / relevant tests. Then update this doc's Progress column and Notes.

Tier 4 items are **decisions to surface**, not refactors — for those, step 2 is "write up the question for the team," not "implement."

---

## New-component checklist (do ALL of these every time we add a library component)

Adding the component isn't done until every doc/surface that indexes it is updated. Missing one (we missed `UI_ELEMENTS.md` for `HStack` the first pass) leaves the component un-discoverable and — critically — **un-enforced** for spec-driven rebuilds. When adding a new `src/ui/` component:

- [ ] **`spec/ui-standards/components.md`** — register the **role → component** row in the right section. This is what makes conformance requirement **C3** bite: an unregistered component can be hand-rolled without it counting as a "bespoke look-alike". _Non-negotiable._
- [ ] **`spec/ui-standards/<area>.md`** — if the component introduces or changes a cross-cutting rule, add/point a line (e.g. `layout.md` for layout primitives, `inputs.md`/`controls.md`/`tables.md` for those kinds).
- [ ] **`src/ui/docs/UI_ELEMENTS.md`** — add the ledger row (what it's made of + why); mandated by `src/ui/CLAUDE.md`.
- [ ] **Showcase** — add a real demo (the component itself, no showcase-only chrome) to the relevant showcase page, and register it in the page metadata/TOC.
- [ ] **Sibling docs/comments** — update anything that referenced the gap (e.g. `Stack`'s doc comment + card once `HStack` existed).
- [ ] **KDD** — if there's a real rejected alternative, write/extend a `kdd/` entry.
- [ ] `pnpm check` green.

---

## Tier 1 — Genuinely missing pure primitives (belong in `src/ui/`)

| #   | Item                                                                                             | Priority | Progress | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------ | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`HStack`** (or `direction`/`justify`/`align` on `Stack.tsx`) — retires ~35 inline-layout sites | High     | 🔵       | Built `HStack` (sibling of `Stack`, `ui/layout/Stack/HStack.tsx`): `gap` sm/md/lg, `align` (def center), `justify` (def start), `wrap`; full-width block like Stack. **2/42 sites swapped** (OutboundSidePanel entered-by + tax rows), `pnpm check` green. Showcase demo added (Page layout page). Registered in `spec/ui-standards/components.md` (Layout) + `layout.md` (enforcement — C3 now covers it). Enforcement guard raised as **#639**. Ledger row added to `src/ui/docs/UI_ELEMENTS.md`. **Deferred:** the ~40-site sweep folds into Carl's later full component-replacement pass (visual inspection across the whole UI); `as="span"` opt-in only if a label-context row forces it |
| 2   | **`DropdownMenu`** (generic action/overflow menu)                                                | Med      | ⬜       | Only `UserMenu`/`LanguageSelector`/`SplitButton` menu exist                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 3   | **`RecordLink`** (kind-toned link to a related record)                                           | Med      | ⬜       | Styled 3 ways across inbound/outbound/customer-returns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 4   | **`ErrorDetails`** (raw error/JSON behind `<details>` in an Alert)                               | Low      | ⬜       | Built twice (SyncModal, ReportDetailView)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 5   | **Labelled-field 4th cell** — inline read-only value                                             | Low      | ⬜       | Line-editor fakes it with `FieldRow labelWidth="auto"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6   | **Fixed-narrow input width** (e.g. `width="date"`)                                               | Low      | ⬜       | Folds in Tier 3 `DateField` bypass; `type="date"` in 4 files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 7   | **Linear `InlineProgress`** + centered **`BasicSpinner`** (w/ message)                           | Low      | ⬜       | Reference-parity                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

**Reference-parity, adopt-when-needed (don't pre-build):** `WizardStepper`, `ToggleButtonGroup`, `HierarchicalOptionAutocomplete`, content `Skeletons`, `InputModal`, `ListSearch`.

---

## Tier 2 — Un-extracted logic primitives ("extract logic, keep JSX explicit")

| #   | Item                                                                 | Priority | Progress | Notes                                                                    |
| --- | -------------------------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------ |
| 8   | **`createListController<State,SortKey>`** — biggest logic dedup      | High     | ⬜       | ~12 verticals, 35–45 lines each; owns sort/filter/page/selection         |
| 9   | **`activityLogFormat` helper + adopt shared `ActivityLogPanel`**     | High     | ⬜       | Kills 2 ~160-line twins (Stocktake, Inbound); outbound/CR LogTab simpler |
| 10  | **Adopt existing `createNextItemWalk`** in stocktake + inbound       | Easy win | ⬜       | Currently re-hand-rolled inline (~55 lines each)                         |
| 11  | **`FilterDatetimeRange`** control / `datetimeRangeFilterDef({zone})` | Med      | ⬜       | Copy-pasted across outbound/inbound/stocktakes/prescriptions             |

---

## Tier 3 — Adoption gaps (component exists; verticals bypass it)

| #   | Item                                                                          | Progress | Notes                                                                                         |
| --- | ----------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| A   | **Extend `ItemSearch`** to serve outbound picker; delete copied CSS           | ⬜       | Needs "show every item" + `availableStockOnHand`; already has `excludeItemIds`/`selectedItem` |
| B   | **Route info-popovers through `InfoTooltip`**                                 | ⬜       | Hand-composed `<Popover trigger={<InfoIcon/>} openOnHover>` in ~5 places                      |
| C   | **`ContentContainer` + `Stack` in Settings** — drop `.measure`/`.sectionBody` | ⬜       | Re-implements `<ContentContainer measure="form" align="start">` + `Stack`                     |
| D   | **`Stack` bypassed** — ~16 `flex-direction:column` divs                       | ⬜       | Folds into #1                                                                                 |
| E   | **`DateField` bypassed** — `TextField type="date"` in 4 files                 | ⬜       | Folds into #6                                                                                 |

---

## Tier 4 — Decisions to surface (KDD-governed; flag, don't silently refactor)

| #   | Item                                                           | Progress | Notes                                                                                                                         |
| --- | -------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| I   | **Shared line-edit modal shell** (5 verticals)                 | ❓       | Full-shell extraction = team call vs KDD. Defensible bits: `createLineDraft` draft-store CRUD, responsive `FieldCluster` row  |
| II  | **`BulkDeleteButton(mutation, label)`**                        | ❓       | Was `SelectionActionModal`, deliberately inlined (`kdd/action-modal`). Narrow wrapper could reclaim ~4–5 atomic-batch deletes |
| III | **`ExportPrintButton`** (4×) and **`HoldToggle`** (4×)         | ❓       | Trivial wrappers; borderline vs explicit-composition                                                                          |
| IV  | Library **`ErrorBoundary`/`GenericErrorFallback`/`DataError`** | ❓       | Reference-parity, low urgency; app has app-level `UnexpectedErrorModal` only                                                  |

---

## Ranked shortlist (issue's recommended order of attack)

| Rank | Item                                                                              | Maps to                         | Progress |
| ---- | --------------------------------------------------------------------------------- | ------------------------------- | -------- |
| 1    | `HStack` / `Stack direction`                                                      | Tier 1 #1 (+ Tier 3 D)          | ⬜       |
| 2    | `createListController`                                                            | Tier 2 #8                       | ⬜       |
| 3    | Consolidate activity-log (adopt `ActivityLogPanel` + extract `activityLogFormat`) | Tier 2 #9                       | ⬜       |
| 4    | Adopt existing `createNextItemWalk` (stocktake + inbound)                         | Tier 2 #10                      | ⬜       |
| 5    | Extend `ItemSearch` for outbound picker; delete copied CSS                        | Tier 3 A                        | ⬜       |
| 6    | `RecordLink`, `FilterDatetimeRange`, route info-popovers through `InfoTooltip`    | Tier 1 #3, Tier 2 #11, Tier 3 B | ⬜       |
| 7    | Surface the two KDD decisions (line-edit-modal shell, `BulkDeleteButton`)         | Tier 4 I, II                    | ⬜       |
