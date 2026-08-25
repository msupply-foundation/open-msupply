# Dashboard — UI migration report

Scope: the whole `dashboard` vertical — one screen (`DashboardPage.tsx`) plus the four create-flow modals it borrows from other verticals. Audited against the eleven dimensions in [`src/ui/docs/MIGRATING_A_VERTICAL.md`](../../ui/docs/MIGRATING_A_VERTICAL.md), the registry ([`spec/ui-standards/components.md` § Dashboard](../../../spec/ui-standards/components.md)), the `#/showcase/statistics` page, the stocktakes reference, and the sibling verticals that fill the same roles (reports, items, outbound-shipments).

**Status: migrated.** F1, F3, F4 and F7 fixed; F5 resolved as a spec edit; F2 filed as a library issue; F6 awaiting a ruling. `pnpm check` and `pnpm test` green (886 tests), `check-reactivity` clean on the diff. The visual pass is the operator's.

## Headline

The vertical was already in good shape on composition: fully on the library's dashboard family (`CardGrid` → `DashboardCard` → `StatsPanel` → `SectionTitle` → `Statistic`), owning **no CSS**, with no inline styles, no colour or px literals, and testids matching the contract exactly. It has no tables, inputs, forms, or side panel, so five dimensions are genuinely not applicable.

Seven findings, none of them a bespoke look-alike. The one that mattered was a **suspend-on-interaction** bug (F1): clicking any create shortcut detached the whole page while the modal chunk loaded.

## Coverage table (after the fixes)

Dimensions: 1 registry/C3 · 2 screen composition · 3 tables · 4 inputs · 5 detail/side panel · 6 styling · 7 reactivity · 8 types · 9 a11y · 10 test hooks · 11 spec consistency.

| Screen                                         |  1  |  2  |  3  |  4  |  5  |  6  |  7  |  8  |      9       | 10  |      11      |
| ---------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :----------: | :-: | :----------: |
| S1 — Dashboard screen (`DashboardPage.tsx`)    | ✅  | ✅  | n/a | n/a | n/a | ✅  | ✅  | ✅  | #775 _(lib)_ | ✅  | ✅ / F6 open |
| Create shortcuts → borrowed modals (4, `lazy`) | ✅  | ✅  | n/a | n/a | n/a | ✅  | ✅  | ✅  |      ✅      | ✅  |      ✅      |

n/a = the screen has no element in that role (no table, no input, no form/side panel). The borrowed modals are owned and audited by their own verticals (inbound-shipments, outbound-shipments, internal-orders); only the dashboard's **mounting** of them was in scope here, which was F1.

Line numbers in the findings below refer to the **pre-fix** file.

## Findings

### F1 — Lazy create modals suspend the page's boundary (dimension 7) · REAL · **FIXED**

[DashboardPage.tsx:649-688](DashboardPage.tsx#L649-L688) — the four modals are `lazy()` ([:72-91](DashboardPage.tsx#L72-L91)) and mounted under `<Show when={open()}>` with **no local `<Suspense>`**.

`lazy()` reads a resource during render, so it suspends the nearest boundary. `DashboardPage` is itself a lazy route component ([index.tsx:8](index.tsx#L8), [App.tsx:155](../../App.tsx#L155)), so the nearest boundary is solid-router's **fallback-less** `<Suspense>` — the same one two siblings already document (`LocationsList.tsx:115`, `CreateStocktakeModal.tsx:97`). Clicking _New inbound shipment_ / _New outbound shipment_ / _Order more_ therefore detaches the entire dashboard body until the chunk lands, and the just-opened `<dialog>` is what re-attaches into an empty page. This is the root `CLAUDE.md` anti-default **"never suspend on an already-open screen"** ([`kdd/solid-reactivity-pitfalls` › no remounts on interaction](../../../kdd/solid-reactivity-pitfalls/draft-kdd.md#no-remounts-on-interaction)).

**Sanctioned precedent** — [`OutboundDetailView.tsx:1094-1096`](../outbound-shipments/detail/OutboundDetailView.tsx#L1094-L1096) mounts its lazy modal as `<Show when={…}><Suspense><Modal open …/></Suspense></Show>`, commented _"Own Suspense boundary, as for the report selector above."_

**Fixed:** each of the four now mounts inside its own `<Suspense>`, with bare `open` (the `<Show>` already gates the mount), matching the sibling. Bare `open` is exactly equivalent to the old `open={signal()}` — the pre-existing `<Show>` meant the prop was only ever read as `true` — so there is no behaviour change beyond the boundary.

### F2 — `Statistic`'s info tooltip is a hand-rolled `title` on an `aria-hidden` span (dimension 9) · REAL, **library** → [issue #775](https://github.com/msupply-foundation/open-msupply-frontend/issues/775)

[`src/ui/elements/dashboard/Statistic.tsx:56-60`](../../ui/elements/dashboard/Statistic.tsx#L56-L60) renders `info` as `<span title={props.info} aria-hidden="true"><InfoIcon /></span>`.

The library already owns this role: [`InfoTooltip`](../../ui/elements/feedback/InfoTooltip.tsx) is a `Popover`-backed tooltip that opens on hover, focus **and** tap, with a required accessible name — and its own doc comment names this exact consumer: _"the '?'/info affordance the current app hangs off field labels **and dashboard stats**"_. Eight sibling verticals use it (patients, settings, inbound-shipments, customer-returns, outbound-shipments ×2, internal-orders). As written, the _products at risk_ explanation the spec quotes verbatim ([ui-surface § inventory-management](../../../spec/dashboard/ui-surface.md)) is unreachable by keyboard and invisible to assistive tech — `aria-hidden` hides the element carrying the `title`, and the row's composed `aria-label` omits it.

The vertical does the right thing (`info={t('messages.products-at-risk-of-stock-out-info', …)}`, [DashboardPage.tsx:578](DashboardPage.tsx#L578)); the defect is inside a shared component, so per the migration guardrail it is a **library task, not a migration fix**. It is also not a one-liner: the info marker currently sits _inside_ the row's `<A>`, and an `InfoTooltip` is a `<button>` — a button inside an anchor is invalid, so the fix has to move the marker out of the link. That is exactly why it wants its own signed-off change.

**Disposition:** filed as [#775](https://github.com/msupply-foundation/open-msupply-frontend/issues/775) (Carl, 2026-07-29) with the nesting complication and acceptance criteria spelled out. Not fixed under this migration.

### F3 — Restated GraphQL-derived types (dimension 8) · REAL · **FIXED**

[DashboardPage.tsx:185-219](DashboardPage.tsx#L185-L219) — all six `createCountResource` calls pass explicit type arguments, and four hand-write `{ storeId: string }`:

```ts
const inbound = createCountResource<
  InboundShipmentCountsResult,
  { storeId: string }
>(InboundShipmentCounts, storeVars);
```

Every generated document is `as TypedDocument<…Result, …Variables>` and every `*Variables` type is exported ([dashboardCounts.generated.ts:21](dashboardCounts.generated.ts#L21) etc.), so both generics infer from the first argument. This is the root `CLAUDE.md` anti-default _"don't restate types inference already gives"_ ([`kdd/type-safety`](../../../kdd/type-safety/draft-kdd.md)), and the hand-written `{ storeId: string }` is a parallel type standing in for a generated one.

**Fixed:** the six type-argument lists are gone, along with seven now-unused type imports (`StockCountsVariables` stays — it backs the `satisfies`). Types-only change, proved by `tsc`.

### F4 — An `errored` resource shows "Loading…" forever (dimension 11 / S2) · REAL · **FIXED**

[DashboardPage.tsx:132-135](DashboardPage.tsx#L132-L135) — `value()` returns `undefined` for every state that isn't `ready`/`refreshing`, and `countPanelState(undefined)` maps to `loading` ([panelState.ts:19](panelState.ts#L19)). That folds `state === 'errored'` into the loading state, so a panel whose fetcher threw would sit on "Loading…" indefinitely — against [ui-surface § S2](../../../spec/dashboard/ui-surface.md#s2--states): _"a panel whose count query fails shows an error state in place of its values"_.

Reachability is low today: `graphqlFetch` never throws by contract, so it takes an unexpected throw (e.g. `JSON.parse` on a malformed source string) to hit. But the mapping is wrong in the direction that hides failure, and the fix is two lines.

**Fixed:** `value()` now returns `{ kind: 'error' }` for `state === 'errored'`, so `countPanelState` maps it to the generic in-panel error instead of loading.

### F5 — The spec's **N/A** stat state has no implementation and no reachable trigger (dimension 11) · REAL · **RESOLVED as a spec edit**

[ui-surface § S1](../../../spec/dashboard/ui-surface.md#s1--dashboard-screen) and § S2 both require it: _"a stat whose value is unavailable while its panel is otherwise shown renders **N/A** (`messages.not-applicable`) with an explanatory tooltip (`messages.no-data-available`) — never a blank."_

The implementation has no N/A path — [DashboardPage.tsx:274](DashboardPage.tsx#L274) is `const num = (n) => formatNumber(n ?? 0)`, so an absent value would print `0`, which is a _wrong number_ rather than a blank. But the state is currently **unreachable**: every count field is non-nullable ([dashboardCounts.generated.ts](dashboardCounts.generated.ts)), and stats only instantiate on the `ready` branch of `StatsPanel`'s `<Switch>`, so a rendered stat always has its value. The `?? 0` exists only to satisfy the `data(): T | undefined` type. Neither `messages.not-applicable` nor `messages.no-data-available` is used anywhere in `src/` — there is no sibling precedent to copy.

Also: `Statistic` has no slot for a **value-level** tooltip distinct from `info` (which is the stat's own explanatory text), so the tooltip half of the spec sentence has no component to land in — implementing it fully implies a library prop.

Two coherent end states; the operator chose **(a) spec moves** (Carl, 2026-07-29). The rejected alternative was to have `num()` return `t('messages.not-applicable')` for `undefined` and give `Statistic` a value-tooltip prop — a dead branch plus a library prop serving a state the contract cannot produce.

**Applied** to [`spec/dashboard/ui-surface.md`](../../../spec/dashboard/ui-surface.md), three places, code unchanged:

- § S1 — the zero/blank sentence now states positively that counts resolve a family at a time and every count the schema returns is a number, so an individual stat is never unavailable while its panel shows values; unavailability is the panel's loading / error state.
- § S2 _Empty / zero_ — the per-stat N/A clause is replaced by "unavailability is a panel state, never a per-stat one".
- The § S2 locale-key table — the _Stat value unavailable_ row (`messages.not-applicable` / `messages.no-data-available`) is removed, so a build no longer reads those keys as ones it must place.

No [`DIVERGENCES.md`](../../../spec/DIVERGENCES.md) entry: the schema is shared with the reference app, so this is an unreachable state being described accurately, not a deliberate behavioural difference.

### F6 — Plugin slot regions are specified as live but nothing mounts them (dimension 11) · REAL · **RESOLVED as a spec edit**

[ui-surface § S3](../../../spec/dashboard/ui-surface.md#s3--plugin-slot-regions): _"The regions are live from the dashboard's first build, rendering the built-ins against an empty contribution set … no plugin system is required for the dashboard to be complete."_ The registry lists `PluginRegionOutlet` as ✅ built, and the showcase demonstrates it mounted inside a `StatsPanel` ([StatisticsShowcase.tsx:195](../../ui-showcase/StatisticsShowcase.tsx#L195)).

`DashboardPage.tsx` mounts no outlet and never imports `regions.ts` — the published-id tree and `mergeRegion` exist and are unit-tested, but nothing renders them. [`BUILD_REPORT.md`](BUILD_REPORT.md) records this as a deliberate deferral to the plugins vertical, with a real rationale (a `<For>` over freshly-merged entries risks remounting stats on every count update; scaffolding three container regions for zero contributions is overkill).

The deferral is sound; the problem is that it lives only in a build report, so the spec still claims something the code does not do — and the next `spec-build` would read § S3 as an instruction to mount outlets.

Two options:

- **(a) Spec moves** — add one line to § S3 recording that the render integration (mounting outlets, honouring suppression at render) lands with the plugins vertical, while the dashboard owns and tests the semantics. Code unchanged.
- **(b) Impl moves** — mount three `PluginRegionOutlet`s against empty contribution lists now.

The operator chose **(a) spec moves** (Carl, 2026-07-29), matching the BUILD_REPORT rationale — the ownership split now lives in the spec rather than only in a build artifact.

**Applied,** in two places, code unchanged apart from a comment:

- [`ui-surface.md`](../../../spec/dashboard/ui-surface.md) § S3 › _Built-ins first_ — states positively that no plugin system is required for completeness (built-ins render directly, gated only by their display gates), that the **semantics** are the dashboard's and hold against an empty contribution set, and that **mounting** contributions at the three regions belongs to the plugins vertical that supplies them.
- [`rules.md`](../../../spec/dashboard/rules.md) § Extensibility carried the same claim ("renders its built-ins through its regions from the start") and got the same split: the semantics are built with the dashboard and testable before any plugin exists; mounting arrives with the plugin system.

The `DashboardPage.tsx` header comment now cites `ui-surface § S3` for the ownership split instead of pointing readers at `BUILD_REPORT.md` — the spec is the source of truth for it.

To be unambiguous about the state of play: **no plugin can contribute to the dashboard today, and nothing else in the app loads plugins either.** There is no `src/sections/plugins`, no plugin loader, and no consumer of `regions.ts` outside its own test. What exists is (1) the vertical's semantics — `DASHBOARD_IDS` + `mergeRegion`, unit-tested; (2) the library's `PluginRegionOutlet` component, exercised only by the showcase's `demoPlugin`. `spec/plugins/` is specified but unbuilt. So § S3 describes an interface that is designed, half-built, and inert.

### F7 — Create-shortcut buttons opt out of the primary variant (dimension 1 / cross-vertical consistency) · REAL · **FIXED**

Raised by the operator as a visual change; the audit's cross-vertical check confirms it as a finding. The three footer create buttons passed `variant="secondary"` ([DashboardPage.tsx:291](DashboardPage.tsx#L291), [:399](DashboardPage.tsx#L399), [:466](DashboardPage.tsx#L466)) while every sibling's create button passes **no** `variant` at all and takes `Button`'s `primary` default — [`InboundShipmentsList.tsx:354`](../inbound-shipments/list/InboundShipmentsList.tsx#L354), [`PatientsList.tsx:244`](../patients/list/PatientsList.tsx#L244). Two-plus verticals agreeing is the house pattern, so the dashboard was the odd one out. Nothing in `ui-surface.md` names a variant (it names the [labelled action button](../../../spec/ui-standards/components.md) role), so no spec edit is implied.

**Fixed** by _dropping_ the prop rather than writing `variant="primary"` — the [reach-for order](../../ui/docs/MIGRATING_A_VERTICAL.md#the-reach-for-order) puts component defaults above props. The showcase's three demo cards ([`StatisticsShowcase.tsx`](../../ui-showcase/StatisticsShowcase.tsx)) are updated the same way, so the reference composition still matches the real screen.

## Verified conformant (not findings)

Listed so the ✅ cells are auditable, and so the deliberate-looking exceptions are not re-litigated later:

- **Uniform panel icon.** Every `StatsPanel` gets `icon={<StockIcon />}`. Looks like a copy-paste smell; the spec mandates it explicitly — _"the **same** stock box glyph on **every** panel: a uniform decorative accent, **not** an icon chosen to match each panel's subject"_ (§ Layout). Conformant.
- **Bare `<CardGrid>`** (no `maxColumnWidth`) matches [`ReportsPage.tsx:276`](../reports/list/ReportsPage.tsx#L276) — two verticals agree, so it is the house pattern. The showcase's capped composition demo sets `maxColumnWidth="26rem"` for its own narrow panel, and says so. Visual-pass note only: check three cards on an ultrawide body.
- **`data-testid` on the footer `Button`s** (vs the `testId` prop the dashboard components take). `Button` extends `JSX.ButtonHTMLAttributes` and spreads `rest`; it has no `testId` prop, so `data-testid` is the correct route. Both spellings appear across `src/sections/` for exactly this reason.
- **`StatusChip colour="var(--error-main)"`** inside `Statistic` — `colour` is a documented "any CSS colour, in practice always a token" API, and a token is what is passed. Not a colour-named prop value, not a literal.
- **Styling.** No section CSS module, no inline `style`, no `#`/`rgb(`/`hsl(`, no px. The only `#` matches in the section are issue references in comments. Vertical rhythm is library-owned (`gap: var(--space-*)` on `.card`, `.body`, `.panel`, `.stats`).
- **Header / composition.** `Page` with only the `header` slot filled (no side panel or content footer per spec); `Header` holds just the `Breadcrumb`, whose leaf is the single `<h1>`; heading order is h1 → h2 (widget) → h3 (panel). No `HeaderToolbar`/`HeaderButtons` — the screen is read-only with no header actions, and `HeaderToolbar` is for a detail header's field cluster.
- **Reactivity, otherwise.** The `.state`/`.latest` read gate is correct and commented ([:129-135](DashboardPage.tsx#L129-L135)); gated families pause their fetch via an `undefined` source; `DashboardCard` resolves `footer`/`icon` through `children()`; `Statistic`'s body is a function, not a stored element. Only F1 failed this dimension.
- **Test hooks.** All four id families match [`e2e/TESTIDS.md` § Dashboard](../../../e2e/TESTIDS.md) verbatim, including the dotted published ids. (`BUILD_REPORT.md`'s line _"TESTIDS.md defines no dashboard-specific ids"_ is stale — the contract has since been written and the page conforms to it. Build-artifact drift, not a UI finding.)
- **Customer-requisition stat links** were unfiltered where the spec asks for New / New+emergency filters — a registered placeholder pending the requisitions vertical. Resolved since: both stats now carry their filters through the list's own contract ([statLinks.ts](statLinks.ts), `OMS-REG-DB-01.59`). Was behaviour, not composition — it never was a migration finding.

## Boutique / uncovered elements

**None.** Every role on this screen resolves to a registered ✅ component. No hand-rolled look-alikes, no ⛔ roles needed, no candidate new components arising from the vertical's own composition.

## Library findings the migration surfaced

| Finding                                                                          | Disposition                                                                                                                              |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| F2 — `Statistic` hand-rolls a `title` tooltip instead of `InfoTooltip`; a11y     | **Filed:** [#775](https://github.com/msupply-foundation/open-msupply-frontend/issues/775) (`bug`). Not fixed here — shared component.    |
| F5(b) — `Statistic` has no value-level tooltip slot (only the stat's own `info`) | **Not a gap.** F5 resolved as a spec edit, so nothing needs it. Recorded here so a later reader doesn't rediscover it as a missing prop. |

No ⛔ registry roles were needed, and no new component is proposed.

## Spec edits made

Both signed off by Carl, 2026-07-29; both are pure-UI/content clarifications of unreachable or not-yet-owned states.

1. **F5** — three edits to [`spec/dashboard/ui-surface.md`](../../../spec/dashboard/ui-surface.md): the § S1 sentence, the § S2 _Empty / zero_ bullet, and the § S2 locale-key row for `messages.not-applicable`.
2. **F6** — [`ui-surface.md`](../../../spec/dashboard/ui-surface.md) § S3 › _Built-ins first_ and [`rules.md`](../../../spec/dashboard/rules.md) § Extensibility, which carried the same claim.

No [`DIVERGENCES.md`](../../../spec/DIVERGENCES.md) entry: nothing here changes what the screen does relative to the reference app.

## Outcome

Fixed, in this order: **F1** (`<Suspense>` around the four lazy modals — the one real bug), **F4** (`errored` → panel error state), **F3** (restated type arguments and seven dead imports dropped), **F7** (create-shortcut buttons back on the `primary` default, showcase kept in step). **F5** and **F6** resolved as spec edits. **F2** filed as [#775](https://github.com/msupply-foundation/open-msupply-frontend/issues/775).

Nothing is left open, and nothing was deferred out of scope beyond F2, which is a shared-library change by the migration guardrail.

Verification: `pnpm check` green (types, stylelint, theme contract 65 tokens, page-CSS guard, browser floor); `pnpm test` green (96 files, 886 tests); `check-reactivity` clean on the diff — two candidates checked and dismissed (the fresh `{ kind: 'error' }` literal reaches a non-keyed `<Match>` reading `.status`; bare `open` is equivalent because the pre-existing `<Show>` already gated the mount). Bundle-size row recorded in [`kdd/bundle-size-by-pr.md`](../../../kdd/bundle-size-by-pr.md).

### The visual pass is the operator's

Route: `/:storeId/` (the store landing screen), and the nav's _Dashboard_ entry — both mount this page. Compare against `#/showcase/statistics` (the _Composition_ card mirrors this screen card-for-card), in **light and dark**:

- The three footer buttons now read as filled primary actions (F7) — check they don't overwhelm the stat rows, and that _Order more_'s `loading` spinner still reads correctly on the filled variant.
- Click each create shortcut and confirm the dashboard **stays put** behind the modal (F1's fix) — no flash of an empty body before the dialog appears.
- The at-risk stat's info marker: currently a hover-only `title` (F2 / [#775](https://github.com/msupply-foundation/open-msupply-frontend/issues/775)) — worth seeing so the issue is grounded in what it looks like.
- Card widths on an ultrawide body: `<CardGrid>` is uncapped here (house pattern, matching reports), so three cards share all the leftover width. If that reads badly, `maxColumnWidth` is a one-prop change.
- Panel loading and error states — the muted single text line, per panel, with siblings unaffected.
