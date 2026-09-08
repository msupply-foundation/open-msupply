# Cold chain — Monitoring — build report

Built from [`spec/cold-chain-monitoring/`](../../../spec/cold-chain-monitoring/) per [`spec/IMPLEMENTING.md`](../../../spec/IMPLEMENTING.md) by `/spec-build cold-chain-monitoring`, stacked on the spec branch `344-cce-monitoring-rewrite` (PR #530) — step 4 of the #344 pipeline.

**Target stack:** SolidJS + Vite, with the shared component library in [`src/ui/`](../../ui/), resolved through the roles in [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md). Pattern source: the sibling vertical [`cold-chain-sensors/`](../cold-chain-sensors/) (same family, built from spec days earlier) for shape and conventions, and the reference vertical `stocktakes/` for the list scaffold.

One routed screen with three tabs, a popover and a modal over it, a file-chooser page action, and one app-wide band mounted by the shell. Read-mostly: the only writes are acknowledging a breach and importing a fridge-sensor file.

## What was built

| Surface                              | File                                                                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| S1 Monitoring screen (tabs, filters) | `monitoring/MonitoringScreen.tsx` (+ `monitoringState.ts`, `monitoringFilters.tsx`, `breachDisplay.ts`, `BreachTypeCell.tsx`)      |
| T1 Chart tab                         | `chart/ChartTab.tsx` — the plot itself `chart/TemperatureChart.tsx` (+ `chartData.ts`)                                             |
| S2 Breach summary popover            | `chart/BreachSummary.tsx` (content of the marker's `Popover`)                                                                      |
| T2 Breaches tab                      | `breaches/BreachesTab.tsx`                                                                                                         |
| S3 Acknowledge breach                | `breaches/AcknowledgeBreachModal.tsx` (+ `acknowledge.ts`)                                                                         |
| T3 Log tab                           | `log/LogTab.tsx`                                                                                                                   |
| S4 Fridge-sensor import              | `import/ImportFridgeTagAction.tsx` (+ `importFridgeTag.ts` — the REST upload)                                                      |
| S5 Notification band                 | `notification/ColdChainNotification.tsx` (+ `notificationLogic.ts`, `notificationStore.ts`), mounted by `src/nav/ShellLayout.tsx`  |
| Wire surface                         | `monitoring.graphql` → `monitoring.generated.ts` (codegen against the pinned `spec/schema.graphql`; no diff outside this vertical) |
| Route tree                           | `index.tsx` — one route, `cold-chain/monitoring`                                                                                   |

Shared wiring, additive only: the route entry `'cold-chain/monitoring': coldChainMonitoringRoutes` in `src/App.tsx`; the band mounted above the page in `src/nav/ShellLayout.tsx`; two locale keys in `src/intl/locales/en/common.json` (below). The nav destination already existed in `src/nav/navConfig.ts` (`cold-chain/monitoring`, `vaccineModule` gate + `SENSOR_QUERY`) — untouched. The `/fridge-tag` dev proxy already existed in `vite.config.ts` — untouched.

## Gates

| Gate                                             | Result                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| `pnpm check`                                     | ✅ green                                                                 |
| `pnpm test`                                      | ✅ green — 236 files / 2530 tests, 103 of them this vertical's (7 files) |
| `pnpm build`                                     | ✅ green                                                                 |
| prettier (every touched file)                    | ✅ green                                                                 |
| `python3 exploratory/tools/check_anchor_refs.py` | ✅ all references resolve                                                |

**Bundle:** +14.1 KB JS gzip / +1.7 KB CSS gzip against `feature/cold-chain` (same machine, both built from a clean `pnpm build`; recorded in [`kdd/bundle-size-by-pr.md`](../../../kdd/bundle-size-by-pr.md)). The vertical is two lazy chunks — `MonitoringScreen` (the screen, its tabs, the chart) and `ColdChainNotification` (the band, loaded with the shell once a session exists) — plus the `StandingBanner` component in the shared graph.

## Anchor coverage — `spec/cold-chain-monitoring/cases/OMS-REG-CCE-02`

`state` = `monitoring/monitoringState.test.ts` · `display` = `monitoring/breachDisplay.test.ts` · `chart` = `chart/chartData.test.ts` · `ack` = `breaches/acknowledge.test.ts` · `import` = `import/importFridgeTag.test.ts` · `band` = `notification/notificationLogic.test.ts` · `access` = `access.test.ts`. **live** = driven through the built screen against the real `remote_server` on `localhost:8000`, store GEN — see [Live verification](#live-verification-c2c4).

| Behaviour               | Covered by                 | Notes                                                                                                                                                                                                                             |
| ----------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.1`                    | `chart`, `state`; **live** | one series per sensor, null-sensor readings dropped; the read asks for every sensor, ascending, at the 8640 cap                                                                                                                   |
| `.2` `.3`               | `chart`; **live**          | `readingsAt` names the moment nearest the pointer — the tooltip's bold date + time                                                                                                                                                |
| `.4` `.5`               | `chart`; **live**          | each sensor's reading at that moment, by name, with its temperature; a sensor with none near it is left out                                                                                                                       |
| `.6`                    | `chart`; **live**          | `breachMarkers` — one per run, at the reading that begins it; a later run marks again; a following different breach marks; per sensor                                                                                             |
| `.7`                    | **live**; `state`          | the marker's popover: sensor name + Breach + glyph, location NAME, start, end, "View all breaches" → `tab=breaches` with `startDatetime` sort (`viewAllBreaches` sets the sort — asserted through the default it restores)        |
| `.8` `.9` `.10` `.11`   | `state`; **live**          | chart wire filter: sensor name `like`, location CODE `like`, `temperatureBreach.type`, the 24h window and its end-only/start-only derivations                                                                                     |
| `.12`                   | `state`; **live**          | no `unacknowledged` on the wire while the switch is unticked — both list together (63 rows live)                                                                                                                                  |
| `.13` `.14`             | `state`; **live**          | `BREACH_SORT_KEYS` = start + end, single-element sort list; default start desc; header click → URL                                                                                                                                |
| `.15`                   | `display`; **live**        | `statusCell` → acknowledge action for an unacknowledged breach (error-toned alert glyph, `IconButton`)                                                                                                                            |
| `.16`                   | `display`; **live**        | acknowledged + comment → the `Comment` popover (hover revealed the stored sentence live); acknowledged without → nothing                                                                                                          |
| `.17`                   | `display`, `ack`; **live** | `isOngoing`, Duration reads _Ongoing_ (error tone, italic), the modal shows the ongoing notice                                                                                                                                    |
| `.18`                   | `ack`; **live**            | `canConfirm` is false for an ongoing breach whatever the comment; live: no comment field rendered, OK disabled                                                                                                                    |
| `.19`                   | `ack`; **live**            | `canConfirm` false for empty AND whitespace-only (space, tab, newline, CRLF, NBSP, ideographic space); live: OK disabled until real text                                                                                          |
| `.20`                   | `ack`; **live**            | `buildAcknowledgeInput` → `unacknowledged: false` + composed comment; `attributionVars` trims; live: stored `Acknowledged by OMS User on 08/09/2026, 13:19: probe from the new FE build.`, row → Acknowledged, band 62 → 61       |
| `.21`                   | `state`; **live** — _half_ | the Unacknowledged switch: ticked → `unacknowledged: true`, unticked → absent, never `false`. **The Status-column select half is exempt** (below)                                                                                 |
| `.22`                   | — (see exemptions)         | Show/Hide columns is the shared `DataTable`'s own control; live-verified present on both tables                                                                                                                                   |
| `.23` `.33`             | `state`; **live**          | `first` + per-tab offset on the wire, one shared page size; live pager on the Breaches tab (63 rows → 2 pages)                                                                                                                    |
| `.24`                   | `band`; **live**           | `bandRows`: breach row iff `breaches.totalCount > 0`, excursion row iff `excursions.totalCount > 0`, none → no band; `notificationGate`; live: band on Home, breach + excursion rows both shown with a temporary EXCURSION config |
| `.25`                   | `band`; **live**           | `showsCount` only above one; the total is `totalCount` (62 live, with a 24h screen window holding no breach — the counts differ, as the rules say they legitimately do)                                                           |
| `.26`                   | `state`; **live**          | default log sort `datetime` asc; every reading listed                                                                                                                                                                             |
| `.27` `.28`             | `state`; **live**          | `LOG_SORT_KEYS` = datetime + temperature, single-element                                                                                                                                                                          |
| `.29` `.30` `.31` `.32` | `state`; **live**          | log wire filter: sensor name, location code, `temperatureBreach.type` (live: Hot Cumulative picked from the added chip), the same two bound chips onto `datetime`                                                                 |
| `.34`                   | `import` — _logic only_    | `classifyResponse` → imported with counts intact; the request shape (URL, `store-id`, multipart field `files`, same-origin cookie, `.txt,.csv`). **The real-file leg is exempt** (below)                                          |
| `.35`                   | `import`                   | a zero-count 200 → `empty`, never a success — including when it created a sensor                                                                                                                                                  |
| `.36`                   | `import`                   | a non-200 → `failed` carrying the body verbatim (the server's typo included); status fallback; transport message; and the shared outcome with `.35` for content the server admits                                                 |

Not a behaviour but binding: `access.test.ts` holds the destination's two gates (vaccine module hides, `SENSOR_QUERY` refuses), and `display` holds the **absence-not-falsiness** rule for temperatures (`hasTemperature(0)` is true; `formatTemperature(0)` renders) that the README's known gap requires.

### Exempt but listed

- **`.21`, the Status-column half.** `ui-surface.md` gives T2's Status column and T3's Breach type column a select filter of their own. The shared `DataTable` has **no per-column filter capability** — nothing in `src/ui/elements/table/` renders a header filter — and improvising one in the vertical would be a bespoke look-alike (C3). The two column selects are therefore **not built**; the same facts are reachable from the filter bar (the Unacknowledged switch; the Breach type chip). The one thing the Status select could express that the bar cannot is an _acknowledged-only_ list. Flagged as a shared-component gap below.
- **`.22` Show/Hide columns.** The control belongs to the shared `DataTable` (Columns popover), so there is nothing in this vertical's code to unit-test; live-verified on both tables. Owed to the e2e suite.
- **`.34`, the real-file leg.** The case frontmatter says `automatable: partial` for exactly this: a genuinely valid fridge-tag file is a fixture from the external `temperature-sensor` crate, which this repo does not carry. The logic leg (how a successful response is read and reported) is tested; the upload was not exercised live because every file this repo can produce degrades to the `.35` outcome (contract ⚠️ wire trap) and leaves a junk `"null"` sensor behind in the store.
- **Render facts** — the tabs' order, the column inventories, the empty-state copy, the truncation notice's text, the band's element order. Asserted live, not in vitest (node environment, no DOM). Owed to the e2e suite.
- Nothing in the case is `(pending: …)` or hardware-gated; `needs: [single-store]` is satisfied by store GEN.

## Live verification (C2/C4)

Driven with a plain Playwright script (no MCP) against this build on the Vite dev server (`:3005`) proxied to the real `remote_server` (`:8000`), store GEN, signed in as `demo`. **No console or page errors at any point**, at desktop and phone widths.

Confirmed on screen: arrival adopts the 24-hour window and records it in the address (`?query=…fromStart/toStart…`); three tabs; the three default chips (From start, To start, Unacknowledged) and the menu offering Sensor name / Location / Breach type; the chart with the two bands, both thresholds emphasised, one dashed line, one breach marker and the legend; the tooltip naming `07/09/2026, 14:01 · Seeded fridge sensor 1 9.5°C`; the marker's popover and its way through to `tab=breaches`; the Breaches table with 63 rows on an unbounded filter — _Ongoing_ in the error tone, `2 hr 52 min` / `1 day` durations, `-1.5°C` and `9.5°C` extremes, sun/snowflake glyphs with the words; the acknowledgement modal in both states (ongoing: notice, no field, OK disabled; ended: OK disabled for empty and whitespace, enabled with text); **a real acknowledgement** — modal closed, row Acknowledged, comment stored with attribution, band 62 → 61; the comment popover; the Unacknowledged switch → `unacknowledged: true` in the URL; sort by Breach end → URL; the Log tab's five columns and its breach-type glyph; the Breach type chip picking Hot Cumulative; the band on Home with **View details**, withheld on the Breaches tab, offered again on the Log tab; with a temporary active `EXCURSION` config and one out-of-range unattributed reading, **both rows** (`Temperature excursion detected! 2 hr ago · Last temperature reading: 12 °C · Device: Seeded fridge sensor 1`), the excursion's way through landing on the Log tab narrowed to the sensor and then withheld there while the breach row's stays offered; and at 390px every tab, every chip and the import action still present (no chart-only screen).

Accessibility (C4), from the rendered tree: both tables are real `table`/`row`/`columnheader` structures; the chart is `img "Temperature by sensor"`; each marker is a `button "Seeded fridge sensor 1 Breach"`; the band is a `status` region reading `strong "Temperature breach detected! 1 day 3 hr ago" · text · strong "Seeded fridge sensor 1" · text "Total unacknowledged: 61" · button "View details"`; the modal is `dialog "Acknowledge breach"` with a labelled textbox and `OK [disabled]` while unconfirmable; the type glyphs are `img "Hot Cumulative"` beside the word.

**Probe residue: none.** The one write — acknowledging `seed-cce-breach-ended-hot` — was reverted by SQL to `unacknowledged = 1, comment = 'probe revert'`, and all three `seed-cce-*` rows diff byte-identical against a pre-probe `.mode insert` snapshot. The temporary `EXCURSION` config and the temporary reading were deleted. Baseline re-verified: 2 sensors, 313 logs, 63 breaches, 62 unacknowledged, 4 breach configs, 0 `EXCURSION` configs, 0 `probe-*` rows; `temperatureNotifications` back to `breaches 62 / excursions 0`.

**C2 gaps** — anchors no automated test exercises against the backend: every server-side refusal (permission-withheld reads, `CommentNotProvided`, `TemperatureBreachDoesNotBelongToCurrentStore`) — none has a client path here; the `.34` real-file import; and the 3-minute poll's re-read (only its interval is asserted).

## Flags

### Spec gaps hit

1. **Column filters vs. the shared table.** `ui-surface.md` T2/T3 name two column-header selects while also saying "the filter bar is the whole filter surface". The `DataTable` cannot render either. See the `.21` exemption; the spec should decide whether the two selects are dropped or the table gains a column-filter capability.
2. **Toasts.** `ui-surface.md` S3 (`success.data-saved`), S4 (the four import toasts) and S5 (`error.fetch-notifications` as a warning toast) all specify toasts. [`ui-standards/controls.md` › action feedback](../../../spec/ui-standards/controls.md#action-feedback) forbids a toast for a user-initiated action's outcome and reserves the toast role (⛔) even for background events. This build follows ui-standards: an acknowledgement's confirmation is the modal closing + the row and the band changing; the import's outcome is an inline `Alert` under the filter bar (success clears after a moment, a failure stays until the next attempt); a failed band re-read is a standing warning row in the band, suppressed while unauthenticated. The four `ui-surface.md` toast lines should be reworded to the in-place surfaces.
3. **The location placeholder.** `ui-surface.md` cites `placeholder.search-by-location-code`; [`ui-standards/tables.md` › filtering](../../../spec/ui-standards/tables.md#filtering) says a text filter's placeholder is the generic _Search…_ and a vertical does not pin per-filter placeholders. Built with the cited key — it adds a fact the label lacks (code, not name) rather than restating the label — but the two should agree.

### `⚠️ VERIFY` items encountered

None — the spec carries no `⚠️ VERIFY` markers.

### Registry roles

Both roles the spec README listed as owed are resolved, at the user's direction (the registry's Status column is the one place a component's build state lives, and the spec README's known gaps asked for exactly these rows):

- **App bar — action-bearing standing-context banner** — ⛔ → ✅ `StandingBanner` (`src/ui/layout/Header/StandingBanner`). Built as the row's own description asked: a full-width row carrying a message AND controls pinned to the inline-end, Alert's severity/glyph language, a polite `status` live region by default. Registered in `components.md`, `src/ui/docs/UI_ELEMENTS.md`, and demoed on the Header showcase page. The internal-orders ancillary banner (the role's first consumer) still composes its own row — migrating it is a follow-up in that vertical.
- **Temperature-over-time chart** — a new 🔶 by-composition row in the Charts table, realised in this vertical (`chart/TemperatureChart.tsx`) as the README asked ("belongs in the section rather than the shared library — but the role still needs a registry row"). Promote to `src/ui/elements/charts` when a second vertical plots temperature over time.

Every other role the surface names resolved to a ✅ or 🔶 row: page frame, header, breadcrumbs, page action buttons, page content (toolbar), page-level tabs, filter bar, data table (list) ×2, empty state, list pagination, loading spinner, popover, icon-only button, labelled action button, async/loading button, modal dialog, dialog chrome + modal footer buttons, confirmation dialog, inline banner/notice, inline status marker, multi-line input, labelled field row / read-only labelled value, inset grouping panel, chart legend.

### Shared code changed

Each is additive and defaulted; no existing consumer changes behaviour:

- **`FilterBar` gains `FilterDateTime`** — a single date-time bound on a chip (the one-sided sibling of `FilterDateTimeRange`), because the surface names its two bounds as two separately-removable filters with their own cited labels (`label.from-start-datetime`, `label.to-start-datetime`). `FilterDateTimeRange` would have made them one chip with an uncited label.
- **`createConfirmOnLeave` gains `sameRouteIsNotLeave`** (default `false`): a query-only navigation — a `?tab=` switch, a filter edit — is not a leave. Needed so the import's in-flight guard does not warn about abandoning an upload that a tab switch does not abandon.
- **`SnowflakeIcon`** added to `src/ui/icons` (Hugeicons `SnowIcon`), the cold glyph the surface pairs with `SunIcon`. The sensors vertical stands in a thermometer for cold; the two should converge on the snowflake.
- **`FRIDGE_TAG_URL`** in `src/config.ts`, beside the other REST routes.
- **`StandingBanner`** — above.

### Deliberately not reproduced from the reference client

Each follows the spec rather than the reference screen:

- **The CCE column is dropped** from both tables. The spec README records it as a known gap with no backing fact ("it should not ship as a permanently empty column"); the reference client renders it always blank. Nothing on `TemperatureBreachNode` or `TemperatureLogNode` names equipment.
- **No chart-only phone screen.** All three tabs, the filter bar and the import action are offered at every width (live-verified at 390px), per `navigation/`.
- **No per-column filters and no end-date filter anywhere.** The filter bar is the whole surface; an `endDatetime` bound would silently drop every ongoing breach.
- **`EXCURSION` does not fall through to a cold "Consecutive".** It is named as itself (`label.excursion`, minted) behind an alert glyph in the warning tone — the reference's underscore-split reads it as cold consecutive.
- **A real 0 °C is shown** in the Breaches table, the acknowledgement modal and the band — every site tests `hasTemperature` (absence), never truthiness. The reference blanks all three.
- **Two date-time chips, not two unlabelled bar controls**; **"Clear all"** (the FilterBar's own) stands in for the reference menu's "Remove all filters" entry, so no `button.remove-all-filters` key was minted.
- **The chart's marker popover is a real button**, so the summary has a keyboard path; the reference's marker is a plain SVG glyph.
- **The band gates on `SENSOR_QUERY`** — the same permission the reference client uses, and, it turns out, the right one (next section).

### The one deliberate difference from the spec, and why

**The notification's permission gate.** `contract.md` › permissions lists `temperatureNotifications` under `QueryTemperatureBreach` and records a wire trap saying the reference client's `SensorQuery` gate "does not match the server's". This build was first written to that contract (`TEMPERATURE_BREACH_QUERY`) and the band did not appear for `demo`, who holds `SENSOR_QUERY`, `SENSOR_MUTATE` and `COLD_CHAIN_API` and **no** `TEMPERATURE_BREACH_QUERY` — yet the read succeeds for them. `server/service/src/auth.rs` is explicit: `Resource::QueryTemperatureBreach`, `Resource::QueryTemperatureLog` and `Resource::MutateTemperatureBreach` are all realised through the **sensor** permissions ("temperature breach (uses sensor permissions)"). So the reference client's gate matches the server exactly, the wire trap is inverted, and the gate here is `SENSOR_QUERY` (`notificationLogic.ts › NOTIFICATION_PERMISSION`, with its test).

## Candidate spec refinements

1. **Correct the permission contract** (`contract.md` › permissions, and the "client gate does not match" wire trap): every cold-chain read and the acknowledgement are authorised by `SENSOR_QUERY` / `SENSOR_MUTATE`; the `TEMPERATURE_*` permission enum members are not what the resolvers check. `rules.md` › permissions ("the corresponding cold-chain read permission", "the breach-mutate permission") should say the sensor permissions. This also settles the worklog's session-3 note that `navigation/contract.md`'s "the temperature reads share the sensor permission" was false — it is true.
2. **Decide toasts vs. in-place feedback** (spec gap 2 above) — the surface should name the in-place surfaces this build uses, or ui-standards should admit the toast.
3. **Decide the two column selects** (spec gap 1) — drop them from T2/T3, or add a column-filter capability to the table role.
4. **State the arrival-window rule's boundary.** `rules.md` says arriving without an explicit range adopts the default window. This build adopts it only on a **pristine** address (no query state at all — `needsArrivalWindow`), so a hand-off that names a filter with no bounds (the band's View details, which must reach a breach older than any day) and a user's deliberately cleared range are honoured as written. Worth stating, since the reference seeds it only from the Chart tab and `.24`'s way-through depends on it.
5. **State what a marker means for a run that began before the window.** The client-side "first reading of a run" rule marks the first in-window reading of an already-running breach (the ongoing seeded breach marks at the window's first reading, live). Correct by the rule as written; the spec could say so.
6. **`heading.acknowledgeBreach`** is the one camelCase key in an otherwise kebab-case catalogue; harmless, but it is the kind of thing a reader trips on.
7. **Import feedback lifetime.** The spec says the success is a toast; this build shows the success `Alert` for eight seconds and keeps a failure until the next attempt. If the surface adopts in-place feedback it should say how long a success stays.

## New locale keys

Two keys, both in `src/intl/locales/en/` only, for copy the spec names without a key or that the spec's own decisions require:

- `label.excursion` — "Excursion". The type word for an `EXCURSION`-typed breach, which the spec says must not fall through to a cold "Consecutive" and which had no name in the catalogue.
- `messages.fridge-tag-import-in-progress` — "A fridge sensor import is in progress. Leaving this page abandons it." The leave-guard's prompt (rules: the user MUST be warned before leaving while an import is in flight); nothing in the catalogue said it.

Every other string uses the key `ui-surface.md` cites, verbatim — all 65 already existed with the cited text. `button.remove-all-filters` (the reference menu entry) was not minted: the FilterBar's own `label.clear-all-filters` fills that role.

## Implementation notes worth a reviewer's eye

- **Every resource is read through `gated()`**, never `.latest` and never directly: the tabs mount under the open screen's boundary and refetch on every filter edit while a chip has focus; the popover's by-id read and the band's poll would otherwise remount the chart or the whole page. Each list resource keys on the serialised variables plus a `refreshVersion` the import bumps, so an unchanged filter never refetches and an import always does.
- **The band's data is module-level resource-signal state** (`notificationStore.ts`, the `createStoreScopedResource` shape): the acknowledgement calls `refetchNotifications()` directly after a save, which is why the count fell 62 → 61 live without waiting for the 3-minute poll. Its source is `undefined` while the gate fails, so the query is never issued for a user it would refuse. The poll runs only while the band is mounted. A failed re-read holds the last good digest and adds the warning row (`graphqlFetch … background: true` — the global modal is never tripped by a self-retrying poll).
- **The filter is a UI vocabulary** (`MonitoringFilter`), the items-Ledger precedent, because one filter set drives two different generated inputs (`startDatetime` vs `datetime`, `type` vs `temperatureBreach.type`); each read's builder emits exactly the generated shape, and every builder is unit-tested. Every list read sends a **single-element sort list** (wire trap 1).
- **The chart** is section-local hand-rolled SVG at measured pixel geometry (a `ResizeObserver` on its container), reusing the charts group's `ChartLegend`; series colours are theme-token mixes with a distinct dash pattern each; markers are HTML `Popover` triggers positioned over the plot. Tooltip tolerance is ten pixels' worth of time, so a sparse window shows the tooltip only near its readings.
- **Durations are derived from start and end** (`durationParts`) — never `durationMilliseconds`, which is 0 for an ongoing breach (wire trap) — and formatted through `Intl`'s unit style, so no date-fns locale is needed.
- **The in-flight import's leave guard** is `createConfirmOnLeave` with the new `sameRouteIsNotLeave`, so switching tabs or editing a filter mid-upload does not prompt.

## Follow-ups

- **`e2e/TESTIDS.md` owes a Monitoring section**, written with the suite. Screen-specific ids this build places: `temperature-chart`, `chart-truncated`, `breach-marker`, `breach-summary`, `view-all-breaches-button`, `acknowledge-breach-button`, `breach-comment`, `acknowledge-breach-modal`, `acknowledge-breach-comment`, `breach-ongoing-notice`, `acknowledge-breach-error`, `import-fridge-tag-button`, `import-fridge-tag-input`, `import-fridge-tag-outcome`, `coldchain-notification-breach` / `-excursion`, `coldchain-notification-breach-details` / `-excursion-details`, `coldchain-notification-error`. Shared: `tab-chart|breaches|log`; `filter-input-sensorName|locationCode|fromStart|toStart|breachType|unacknowledged` (the date-time chips stamp their date input); `filter-option-<key>` / `filter-option-<TYPE>`; `header-<col>` / `cell-<col>` over `status`, `statusLabel`, `sensorName`, `location`, `startDatetime`, `endDatetime`, `duration`, `type`, `maxOrMinTemperature` (T2) and `datetime`, `sensorName`, `location`, `temperature`, `breachType` (T3); `nothing-here`; `dialog-button-ok|cancel`; `confirmation-modal` (+ `-ok`) for the new-sensor prompt and the leave guard.
- **Column-filter capability** for `DataTable`, or a spec decision to drop the two selects (`.21`'s Status half).
- **Migrate the internal-orders ancillary banner onto `StandingBanner`** — the role's first consumer, now that the component exists. Another vertical's directory, so not touched here.
- **`spec/DIVERGENCES.md` is absent** on this branch and its base (20 spec files link to it; `gather_status.py` reads it). This build recorded no divergence — every deliberate difference above follows the spec or ui-standards rather than departing from them — so no D-number was needed; the toast decision is ui-standards-owned. Raised, not worked around.
- **A valid fridge-tag fixture** for `.34`'s live leg (external `temperature-sensor` crate).
- **Backend gaps this vertical is constrained by**, restated from `contract.md`: no readable breach thresholds (the chart's bands are constants), the excursion read ignoring its active-sensor filter (a retired sensor's excursion is permanent), no server guard on acknowledging an ongoing breach, the error-free mutation union, and the fridge-tag route's zero-count successes that leave a `"null"` sensor.
- **The sensors vertical's cold glyph** is a thermometer; this one is the snowflake the surface names. Converge.
