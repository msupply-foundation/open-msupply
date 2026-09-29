# Cold chain › Monitoring — UI migration report

**Status: MIGRATION COMPLETE — visual pass done (2026-09-11): the chip-label and acknowledge-action tweaks are applied; the end-only date range is ruled open on the chart (rules › the chart).** Every finding the audit raised is fixed or ruled on; `pnpm check`, `pnpm test`, eslint and prettier are green, and the reactivity review of the diff is clean. Scope was the whole vertical (every file under `src/sections/cold-chain-monitoring/`, including the shell-mounted notification band), plus the one library deletion and the two shared documents (`e2e/TESTIDS.md`, the e2e suite) the filter change reached. The audit findings are kept as [an appendix](#appendix--the-audit-findings) so the reasoning survives.

## Outcome

### Code fixes — all applied

| Finding                        | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1** · filter bar in header  | The bar left the page header. Both tables carry it in their own toolbar via `DataTable`'s `filters` slot ([`BreachesTab.tsx`](breaches/BreachesTab.tsx), [`LogTab.tsx`](log/LogTab.tsx)); the Chart tab, having no table, carries the same bar as the first block of its body ([`ChartTab.tsx`](chart/ChartTab.tsx)). One URL-backed filter, one `onFilterChange` handed down from the screen, so a chip edited on any tab is the chip on every tab |
| **R2** · two date-time chips   | One **Date/time range** chip (`FilterDateTimeRange`, key `startDatetime`), holding both bounds, either side clearable. `MonitoringFilter` now carries `startDatetime: IsoDateTimeRange \| null`; `withDefaultWindow`, `chartWindow`, `widenToInclude`, the three wire builders, the band's `detailsFilter` and the import's `onNarrow` follow, with every test rewritten to the new shape (48 state tests, all passing). Behaviour is unchanged     |
| **R3** · column arrays         | Both tables' `columns` are `createMemo` (KDD §14)                                                                                                                                                                                                                                                                                                                                                                                                   |
| **R4** · modal headings        | "Details" is a `FormSection` (`headingLevel="h3" heading="group"`) over the inset panel; the comment `TextArea` shows its own **Comment** label — the bare `Text` headings and `hideLabel` are gone. Testids and the initial-focus target are untouched                                                                                                                                                                                             |
| **R5** · hand-rolled flex row  | The band row is an `HStack gap="sm" wrap align="baseline"`. Per **D4** the hairline separators stay: `.item` keeps its inline-start rule, now spaced by the stack's gap on one side and its own padding on the other; the `.row` class is deleted                                                                                                                                                                                                   |
| **R6** · rows rebuilt per poll | Two explicit `<Show>` blocks over a new `bandRow(data, kind)` accessor (tested), each a stable `AlertRow` whose text updates in place — the polite live region announces the change and a focused **View details** keeps focus. The `<For>` over fresh row objects is gone                                                                                                                                                                          |
| **R7** · `as Extract` casts    | `importedOf` / `failedOf` narrowing accessors in [`importFridgeTag.ts`](import/importFridgeTag.ts) (tested), so each `<Match>` renders the narrowed member; the union's members are now named types. **Zero `as` casts on outcome values in the vertical**                                                                                                                                                                                          |
| **R8** · truncation severity   | `severity="warning"`                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **R9** · font-size literal     | `var(--text-xs)` for both axis label classes                                                                                                                                                                                                                                                                                                                                                                                                        |
| **R10** · per-tab `fillBody`   | `fillBody` is always on; the Chart tab wraps its content in `ContentContainer size="wide" padded align="start"`, the mixed-tabs pattern items and patients use                                                                                                                                                                                                                                                                                      |

### Library change (D3, approved)

- **`FilterDateTime` deleted** from [`FilterBar.tsx`](../../ui/elements/selectors/FilterBar.tsx). It had exactly one consumer (this vertical) and was minted for it; `FilterDateTimeRange`'s doc comment now names both callers. `UI_ELEMENTS.md` never listed it, so nothing else to update.

### Shared documents changed (approved)

- **e2e** — [`cold-chain-monitoring-regression.spec.ts`](../../../e2e/specs/cold-chain-monitoring-regression.spec.ts) `dateChip()` locates `filter-input-startDatetime-from/-to` here and still `filter-input-datetime-from/-to` on the current app. The legacy-picker detection and every other id are unchanged. Re-run hermetically against this front end after the change: **43 passed** — see [Verify](#verify).
- **`e2e/TESTIDS.md`** § Cold chain › Monitoring — the date-filter row now describes one grouped chip on both front ends and names the two id stems; the "structurally different, no id can fix it" paragraph is gone because it is no longer true.

### Decisions taken (yours)

- **D1** — keep the combined date-time cell (Breach start / Breach end / Date time). No change. The pair-vs-combined question is a tables-standard item, not this vertical's.
- **D2** — drop the two column-header select filters from the spec (SE8). `DataTable` gains no column-filter capability under this migration.
- **D3** — delete `FilterDateTime`. Done.
- **D4** — keep the hairline separators on the band. Done; R5 shrank to the `HStack` swap.
- **D5** — the chip key is `startDatetime`.
- **R10's measure** — `wide` (80rem). **L2** — left.

## Coverage table — greened

Legend: ✅ clean · ✔ fixed this pass · ° benign, noted · — N/A.

Dimensions: **1** C3/registry · **2** composition · **3** tables · **4** inputs · **5** forms/dialogs · **6** styling · **7** reactivity · **8** types · **9** a11y · **10** test hooks · **11** spec.

| Screen / file                                        | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  | 11  |
| ---------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.tsx                                            | ✅  | ✅  | —   | —   | —   | ✅  | ✅  | ✅  | —   | —   | ✅  |
| monitoring/MonitoringScreen.tsx                      | ✅  | ✔   | ✔   | ✅  | —   | ✅  | ✅  | ✔   | ✅  | ✅  | ✔   |
| monitoring/monitoringFilters.tsx                     | ✅  | —   | ✔   | ✔   | —   | ✅  | ✅  | ✅  | ✅  | ✔   | ✔   |
| monitoring/monitoringState.ts · breachDisplay.ts     | —   | —   | —   | —   | —   | —   | ✅  | ✅  | —   | —   | ✅  |
| monitoring/BreachTypeCell.tsx                        | ✅  | —   | ✅  | —   | —   | ✅  | ✅  | ✅  | ✅  | —   | ✅  |
| monitoring/monitoring.module.css                     | °   | —   | —   | —   | —   | ✅  | —   | —   | ✅  | —   | —   |
| chart/ChartTab.tsx                                   | ✔   | ✔   | ✔   | —   | —   | ✅  | ✅  | ✅  | ✔   | ✅  | ✔   |
| chart/TemperatureChart.tsx + .module.css             | °   | —   | —   | —   | —   | ✔   | ✅  | ✅  | ✅  | ✅  | ✅  |
| chart/BreachSummary.tsx                              | ✅  | ✅  | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| breaches/BreachesTab.tsx                             | ✅  | —   | ✔   | —   | —   | ✅  | ✔   | ✅  | ✅  | ✅  | ✔   |
| breaches/AcknowledgeBreachModal.tsx                  | °   | —   | —   | ✅  | ✔   | ✅  | ✅  | ✅  | ✅  | ✅  | ✔   |
| log/LogTab.tsx                                       | ✅  | —   | ✔   | —   | —   | ✅  | ✔   | ✅  | ✅  | ✅  | ✔   |
| import/ImportFridgeTagAction.tsx                     | °   | —   | —   | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✔   |
| notification/ColdChainNotification.tsx + .module.css | ✔   | ✅  | —   | —   | —   | ✔   | ✔   | ✅  | ✔   | ✅  | ✔   |
| spec/cold-chain-monitoring/ui-surface.md             | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | ✔   |

Every cell is clean, fixed, or a recorded benign exception. Implementation and spec agree again, so the next `spec-build` reproduces this UI instead of re-introducing the drift.

## Spec edits — signed off and applied

All in [`spec/cold-chain-monitoring/ui-surface.md`](../../../spec/cold-chain-monitoring/ui-surface.md), roles never component names.

- **SE1** — S1 § Filters no longer restates the shared filter bar's menu ("labelled Filters", "Remove all filters"); § Layout no longer places the bar in the app-bar page-content region, and says every tab carries the shared bar (the tables in their toolbar, the Chart tab above the plot). The stale "a role the charts registry does not yet carry; see the known gap" clause on the chart went with it — the registry row exists. The import outcome's in-place notice is named in the App bar line.
- **SE2** — the two From/To filter rows are one **Date/time range** row of type _date & time range_, both bounds named, either side clearable, shown by default.
- **SE3** — S3: "the **Comment** heading over a multi-line input" → "a multi-line input labelled **Comment**", in both the body prose and the Layout.
- **SE4** — S3 § Layout: the details block is a form section holding an inset grouping panel of read-only labelled values (the registry's read-only role; the field-row role is for controls).
- **SE5** — T1: "a warning in the error tone" → "a warning notice".
- **SE6** — toasts → in-place surfaces: S3's confirmation is the modal closing plus the row and band changing, its rejection an inline notice inside the dialog; S4's outcome table names an inline notice in S1's app bar (success clears itself, failure stays until the next attempt); S5's failed re-read is a standing warning row.
- **SE7** — the always-blank **CCE** column rows are removed from T2 and T3 and the columns renumbered.
- **SE8** — T2 Status and T3 Breach type no longer claim a column-header select; § Filters says columns carry no filters of their own, and the reference-client sentence now lists those two header filters among the ones not reproduced.

## Boutique / uncovered elements

Elements no library component covers, each tagged (a) candidate library component, (b) ⛔ registry role awaiting a build, or (c) deliberate documented exception.

- **The temperature-over-time chart** ([`chart/TemperatureChart.tsx`](chart/TemperatureChart.tsx)) — **(c)**, already recorded in the registry as a 🔶 by-composition role living in the section until a second vertical plots temperature over time. Two details inside it are deliberate: the inline `style={{ left, top }}` on the marker slots and the tooltip is measured pixel geometry, exactly what the library's own `SvgPlot` does for its tooltip ([`svgPlot.tsx:205-208`](../../ui/elements/charts/svgPlot.tsx#L205-L208)) and `Popover` does for its panel — not layout, so not a C3 finding; and the `.marker` rem sizes are glyph sizing, as `StandingBanner`'s and `Comment`'s icons are. Its axis chrome duplicates the library's because the library exports none — **L1**.
- **The _Ongoing_ word in the Duration cell** ([`monitoring.module.css`](monitoring/monitoring.module.css)) — **(c)**. An error-toned italic word standing in for a value: `StatusBadge` is a chip, and a chip in a value column reclassifies the column ([`tableHelpers.tsx:248-254`](../../ui/elements/table/tableHelpers.tsx#L248-L254)); `AbsentValue` is the muted treatment; `Text` never carries colour. A three-line CSS module, tokens only, is the right rung. Candidate: an `AbsentValue` tone variant — **L5**.
- **The hidden `<input type="file">` behind the import page action** ([`ImportFridgeTagAction.tsx`](import/ImportFridgeTagAction.tsx)) — **(c)**. Spec S4 says the action "opens the platform file chooser" (behaviour, spec-owned); the library's only file input lives inside `UploadZone`, a drop zone for a modal. A "file-chooser button" is a candidate component if a second consumer appears.
- **The band's hairline separators** ([`ColdChainNotification.module.css`](notification/ColdChainNotification.module.css)) — **(c)** by **D4**: the showcase demos this band with text separators and the reference app uses a `|` glyph, so no pattern is established; a two-line CSS module, tokens only, until one is.
- **⛔ registry roles:** none needed.

## Library findings

Flagged, not fixed — the migration does not change shared components (the one deletion, D3, was approved separately).

- **L1 — The charts group has no continuous-axis plot frame and exports no axis chrome.** `SvgPlot` is band-scaled (categorical x), so a time-series line chart cannot use it, and `plotChart.module.css`'s `.grid` / `.axisLabel` / `.cursor` / `.tooltip` classes are not exported — so [`TemperatureChart.module.css`](chart/TemperatureChart.module.css) duplicates ~60 lines of them. **Disposition:** an [`ADDING_A_COMPONENT.md`](../../ui/docs/ADDING_A_COMPONENT.md) task when the chart is promoted (the registry's stated trigger: a second consumer).
- **L2 — `plotChart.module.css:70`** `font-size: 0.75rem` literal where `--text-xs` exists. **Disposition:** left, your call.
- **L3 — `FilterDateTime`.** Resolved: deleted (D3).
- **L4 — `DataTable` has no column-header filter capability.** **Disposition:** resolved by D2 as a spec edit (SE8), not a library build.
- **L5 — `AbsentValue` has no tone variant.** **Disposition:** deferred; the _Ongoing_ word stays a documented exception.

## Noticed during the work (not fixed)

- **Two stale sentences remain in the spec**, outside the signed-off edits: [`README.md` § Known gaps](../../../spec/cold-chain-monitoring/README.md) still lists "No registry role for the temperature chart" and "The notification band's registry role is not built", and S5 § Layout still says the standing-banner role is "not-yet-built pending exactly that". Both roles have registry rows and components since the build. A one-line spec tidy each.
- **The registry's `Toolbar` row** ([`components.md` § screen structure](../../../spec/ui-standards/components.md#screen-structure-regions)) still says "`Toolbar` stays for other content (a list's filter bar)". `tables.md` forbids exactly that placement, and every list now complies. The note should name something else (the items statistics band, an import outcome notice) or nothing.
- **The stocktakes list and `SensorsList` build their `columns` as plain accessors**, the same §14 miss this vertical had (R3). Out of scope here; two one-line fixes in their own verticals.
- **`TabPanel` unmounts inactive panels** ([`Tabs.tsx:54`](../../ui/elements/tabs/Tabs.tsx#L54)), so switching tabs re-creates the tab's resource and refetches. Pre-existing and shared by every tabbed screen; noted only because a reviewer may wonder why the tables spin on each switch.
- **The bookmarked-URL break.** A `?query=` address from the pre-migration build carries `fromStart`/`toStart`, which the new state ignores; the arrival-window rule does not re-seed a window into an address that already names a filter, so such a bookmark opens with no date bounds. Accepted for an unreleased screen (your ruling under R2).

## Verify

- `pnpm check` — green (CSS types, `tsc -b`, stylelint, theme contract 71 tokens, page CSS, reduced motion, browser floor).
- `pnpm test` — green: **236 files, 2537 tests** (the state tests rewritten to the range shape, plus two new tests: `bandRow`, and the `importedOf`/`failedOf` narrowing).
- eslint on the vertical, `FilterBar.tsx` and the e2e spec — 0 errors; the five `solid/reactivity` warnings in `FilterBar.tsx` are pre-existing library warnings unrelated to the deletion.
- prettier — every touched file clean.
- `check-reactivity` on the working diff — **clean**. Every new `<Show>` passes an accessor without `keyed` (the band rows and the import outcome update in place); the three `FilterBar`s read `props.filter` / `props.state.filter` through lazy prop getters; `importedOf`/`failedOf` return the same reference, so a `<Match>` never re-creates its child; both column arrays are `createMemo`.
- `pnpm build` — green. The vertical's two lazy chunks: `MonitoringScreen` 8.92 KB gzip (8.7 at the build report — the Chart tab now pulls `ContentContainer` and the modal `FormSection` into the chunk), `ColdChainNotification` 1.61 KB (1.6). `FilterDateTime` left the shared `FilterBar` graph. Record the PR-level delta in `kdd/bundle-size-by-pr.md` when the PR is cut.
- **e2e, this front end** — `OMS_DIR=/Users/carl/GitHub/open-msupply-internal pnpm e2e:local cold-chain-monitoring-regression`: **43 passed, 0 failed** (42.8 s) against the monorepo's own server and `server/data/e2e` datafile, which is where the suite's backend side lives (GRY's `vaccine_module`, the current app's test ids — commit `4d6cefde0e`). The runner's default `OMS_DIR` of `../open-msupply` predates the monorepo move: pointed at a separate `develop` clone it restores a datafile with GRY's vaccine module **off**, the Cold chain section never renders, and the suite fails at its first navigation — a stale default, not a regression. Worth fixing in `scripts/e2e/run-e2e.sh` and `e2e/README.md` (the worklog already flags it).
- **Not run:** the same suite against the current app (`cd ../client && FE_SUITES_DIR=/Users/carl/GitHub/open-msupply-internal/frontend E2E_RUN_TAG=oms yarn e2e:local cold-chain-monitoring-regression`). The only shared-code change is `dateChip()`, whose current-app arm (`filter-input-datetime-from/-to`) is untouched, so the risk is low — but the suite is shared and should be greened on both before the PR merges.

### Your visual pass — required, the skill cannot sign it off

Open each in **light and dark**:

| Screen            | Route                                       | Compare against                                   | Watch for                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chart tab         | `/:storeId/cold-chain/monitoring`           | `#/showcase/charts`, `#/showcase/table` (toolbar) | **the biggest change**: the filter bar now sits above the plot inside the body, with one **Date/time range** chip (two date-time fields, an en-dash between); the `wide` measure hugging the start edge; the warning-toned truncation notice |
| Breaches tab      | `…?tab=breaches`                            | `#/showcase/table`, `SensorsList`                 | the bar in the table toolbar beside the row count; that a chip edited here is the chip on the Chart tab; column widths and drag-resize; _Ongoing_; the acknowledge glyph and comment popover                                                 |
| Log tab           | `…?tab=log`                                 | `#/showcase/table`                                | as above                                                                                                                                                                                                                                     |
| Acknowledge modal | an unacknowledged ended row's status action | `#/showcase/forms`                                | the ruled **Details** section heading over the grey inset block; the `TextArea`'s own **Comment** label; OK disabled until text; an ongoing breach still shows the notice with no field                                                      |
| Breach summary    | a chart marker                              | —                                                 | unchanged                                                                                                                                                                                                                                    |
| Notification band | any screen with an outstanding breach       | `#/showcase/header` → Standing-context banner     | the hairline separators now sit centred between items (gap one side, padding the other); wrapping at narrow widths; that a poll (or an acknowledgement) updates the count **without** the row flickering                                     |

**Chip lifecycle check (the e2e suite covers this, but drive it once):** on the Chart tab remove the Date/time range chip, re-add it from the menu, clear only its To side, then **Clear all** — the URL should follow each step and the Breaches tab should show the same chips afterwards.

---

## Appendix — the audit findings

The detail behind each fix, kept as the record. `file:line` references are to the **pre-fix** code.

### R1 — The filter bar rendered in the page header (dims 3, 2) — binding

`MonitoringScreen.tsx:148-154` put the `FilterBar` in a `<Toolbar>` inside the `<Header>`. [`tables.md` § Toolbar](../../../spec/ui-standards/tables.md#toolbar) is binding: the filter bar MUST render in the table toolbar, never in the page header or app bar, overriding any vertical spec that places filters elsewhere. The screen's comment gave the reason — one filter set serves the chart as well as the two tables — a real tension the rule does not address, but not a licence for the header. Only one tab panel is mounted at a time ([`Tabs.tsx:54`](../../ui/elements/tabs/Tabs.tsx#L54)), so there is never more than one bar instance.

### R2 — Two single-bound chips where the house pattern is one date-time range chip (dims 3, 4, 10, 11)

`monitoringFilters.tsx:66-89` rendered the start window as two `FilterDateTime` chips — a component minted for this one consumer. Every other date range in the app is one chip (seven list verticals via `FilterDateRange`; the items Ledger tab's identical From/To date-time shape via one `FilterDateTimeRange`), and the reference app's monitoring `Toolbar.tsx` groups the two `dateTime` elements under a single `group` filter — the skill names the reference app as authoritative for how filters group. The spec's two-row table was the drift. `FilterDateRange` (date-only, widens each day to UTC day bounds) was ruled out: the 24-hour window ending now, `widenToInclude`'s move to the breach's exact start instant, and the chart's instant-precision axis all need instants.

### R3 — Column arrays were plain accessors (dim 7) — binding

`BreachesTab.tsx:181`, `LogTab.tsx:89`. [`kdd/solid-reactivity-pitfalls` §14](../../../kdd/solid-reactivity-pitfalls/draft-kdd.md): an array handed to TanStack's reference-memoised `columns` prop MUST be `createMemo`, or every read rebuilds four layers of its memo chain.

### R4 — Bare `Text` headings and a hidden-label field in the acknowledge modal (dim 5)

`AcknowledgeBreachModal.tsx:126-128, 176-188`. Six sibling modals title a group with `FormSection` (`headingLevel="h3" heading="group"`); the registry's field-row row says a field standing alone uses its own label. The spec named the inline "labelled field row" role for the four read-only facts, but the code's read-only labelled values are the registry's read-only role (the `FormRow` row says so for a dialog's facts) — so the spec's role link moved (SE4).

### R5 — Hand-rolled flex row on the band (dims 1, 6)

`ColdChainNotification.module.css:6-17`: `.row` was `display: inline-flex; flex-wrap: wrap; align-items: baseline` — the registry's `HStack`. The separators were a decision (D4): the showcase demos this band with `·` text and the reference app uses `|`, so no pattern was established and the hairline stayed.

### R6 — Both banner rows torn down and rebuilt on every poll (dims 7, 9)

`ColdChainNotification.tsx:99` rendered `<For each={rows()}>` over `bandRows(notifications())`, fresh objects per 3-minute poll; `<For>` keys by reference, so both `StandingBanner`s remounted each poll — losing focus on **View details**, and replacing rather than updating the polite `status` live region. Two kinds rendered from a computed list was also render-from-config where [`kdd/explicit-composition`](../../../kdd/explicit-composition/draft-kdd.md) wants two explicit blocks.

### R7 — `as Extract<…>` casts to narrow the import outcome (dim 8)

`MonitoringScreen.tsx:167-183, 207-215` cast `o()` to a union member inside each `<Match>`, with dummy `: 0` / `: ''` fallbacks; [`kdd/type-safety`](../../../kdd/type-safety/draft-kdd.md) keeps `as` out of verticals. The file's own sibling already showed the fix (`BreachesTab.tsx:64-67` `commentOf`).

### R8 — The truncation notice was `severity="error"` for a warning (dims 1, 9)

`ChartTab.tsx:93`. The copy begins "Warning: …" and the spec calls it a warning; `Alert`'s severity drives the glyph and the meaning assistive tech is told. The reference app renders it as red text (colour alone), which the spec had captured as "a warning in the error tone".

### R9 — Axis label font-size literal (dim 6)

`TemperatureChart.module.css:52, 57`: `0.75rem` where `--text-xs` is 0.75rem and the same file's tooltip already used it.

### R10 — The Page's fill mode flipped per tab (dim 2)

`MonitoringScreen.tsx:136` toggled `fillBody={tab() !== 'chart'}`. The two sibling screens mixing table and non-table tabs (items, patients detail) keep `fillBody` on and wrap the non-table tab in `ContentContainer padded`, whose doc says it exists "for exactly this mixed table+form detail view".

### Benign — checked and left alone

- `JSON.parse(key) as Variables` in the resource fetchers — the reference vertical's own pattern.
- `stroke-width: 1px / 2px` and the tooltip's `1px` border — hairlines, the sanctioned px.
- The import-outcome `Alert` in a `<Show>`-gated `<Toolbar>` — the facility register does exactly this ([`FacilityRegister.tsx:233-262`](../names/register/FacilityRegister.tsx#L233-L262)); not a `StandingBanner` (no controls).
- `title={t('tooltip.import-fridge-tag')}` on the page action — settings does the same.
- `OkButton` as the acknowledge confirm — [`controls.md`](../../../spec/ui-standards/controls.md#footer-button-identity) reserves OK for a confirm that "genuinely isn't a save"; acknowledging is a confirmation with a required comment, the spec and reference app label it OK, and the e2e suite locates `dialog-button-ok`.
- Status, Breach start/end, Duration, Type and Max/Min columns use an explicit helper plus a `size` — `CELL_TYPES.md`'s rule for a type with no preset key; `sensorName` and `location` use the presets.
- The card model (`compact: { viewMode: 'card' }`, one primary header column) matches the family sibling `SensorsList`.
- The Chart tab carries no empty-state placeholder: a window with no reading draws a blank chart (rules › the chart), and the shared `nothing-here` empty state belongs to the two tables alone.
- No breadcrumb icon — the shell supplies the section glyph; `SensorsList` passes none either.
- The Status column as text, not a `StatusChip` — the spec types it text, the reference app and `SensorsList` render text; the chip is the lifecycle-status role.
- `BreachSummary`'s close `IconButton` in an `HStack justify="end"` — `Popover` has no close facility; three sibling panels compose one the same way.
- `BreachTypeCell`'s `HStack gap="sm"` inside a cell — `SensorsList`'s breach cell is identical.
