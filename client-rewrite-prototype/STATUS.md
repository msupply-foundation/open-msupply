# Status — front-end rewrite prototype

_Last updated: 2026-07-01_

## Current phase

Project setup / first vertical slice. Working through the "To decide" list one item at a time.

## ▶ Next action (resume here)

Building the **Outbound Shipments page as a component storybook** in [`app/`](./app/) (runs on **:3010**, alongside the current app on :3003). See "Done → Built in the slice" below for the full inventory.

**▶ Next element: Feedback** (tab 4 — currently a placeholder) — alerts / toasts + the month/year date picker.

**✓ Done — Table** (tab 3): the TanStack validation gate — **decision #8 now DECIDED**. A real semantic `<table>` on TanStack Table's headless engine, styled to a faithful OMS token port: single-column sort (`aria-sort` + live-region announce), **URL-backed filtering** (header FilterBar writes query params; table reads them as `columnFilters` — shareable/bookmarkable, referentially stable, via a temporary `hooks/useUrlState` that swaps for router search hooks at #9), pagination **+ a 10k-row virtualised benchmark mode**, **frozen** first column (pinning), **column resize** (drag + arrow-key; CSS-var widths + memoised body so a drag doesn't re-render the tree), **column reorder** via **dnd-kit** (drag + keyboard, SR announcements), show/hide-columns + density menus, fullscreen, row selection, and a container-query **card view** that swaps to a `<ul>` list with its own sort control. Cells ported 1:1 (numeric …+full-precision tooltip, currency, date, text+tooltip, name+colour-dot, comment→Radix Popover, hand-rolled **StatusChip**) + restricted-row greying (Shipped/Verified). The **ContentFooter is now contextual** (detail ↔ selection actions) via a `stores/selectionFooter` zustand bridge. Mock data in `app/src/mocks/` (InvoiceNode-shaped, deterministic, count-parameterised). Verified in-browser (desktop + card + selection-footer swap). Key finding: today's MRT table isn't even a semantic `<table>` (`layoutMode:'grid'` + keyboard shortcuts off) → ours is an **a11y upgrade** (argument for `ARGUMENTS.md`). **Outstanding (runtime):** Lenovo M10 numbers + a screen-reader audit. Full rationale in `DECISIONS.md`.

**✓ Done — Selectors** (tab 2): the full "pick from a list" spectrum, each justified by "own the simple, buy the hard" — **native `<select>`** (plain drop-down), **Radix Select** (styled drop-down, colour-dot options), **Downshift combobox** (the flagged item autocomplete, filters on code *or* name, two-line options, clearable), and **Downshift multi-select** (removable tags, controlled). RTL is demoed via the footer language selector (like every element); a root Radix **`DirectionProvider`** was added to `LocaleProvider` so all Radix widgets are direction-aware. New deps: `@radix-ui/react-select`, `@radix-ui/react-direction`; Downshift now in use. Full rationale + deferred items (virtualisation, server-paginated search, portaled/collision-aware menu) in `DECISIONS.md`.

**Carried (open):** validate the Vite plugin-load path (Module Federation on Vite) — decision #2's gate. Build a hello-world **remote** plugin via the chosen Vite route (lead: `@module-federation/vite`) and load it at runtime into the host sharing one React. See `DECISIONS.md` decision #2.

**✓ Done — Performance** (tab 5): the **state-management benchmark harness** (`app/src/benchmark/`), built to [`BENCHMARK.md`](./BENCHMARK.md). One controlled form written against a single swappable `StateAdapter`; three tiers (**naive** / **context-memo** / **zustand**) selected at runtime; reactive readers; a draggable floating HUD with a manual render registry + INP/FPS/long-task instrumentation; render-flash highlighting; single + side-by-side modes; URL params (`?mode=&impl=&fields=`). Live-verified render contrast at 200 fields: **naive 205 → context-memo 30 → zustand 3** renders per keystroke. Decided: tiers 1–3, real `zustand` dep (v5). **Deferred (phase C):** automated scripted run, scaling-curve chart, CSV/JSON export. **Open (run-time, not code):** final numbers on throttled desktop vs real Lenovo M10. Feeds decision #4 — it's the instrument, not a ratification. See `DECISIONS.md` (2026-07-01, benchmark harness).

**RTL is a standing requirement:** show the RTL version of every element as it's built (Carl, 2026-07-01).

## Goal

Build **one vertical slice** of the app, end to end, that can be demoed and that validates the founding principles (React + TS, simpler UI, headless components, typed data, traceable state).

## Measured against (dev lead's spec)

The external bar now lives in [`SPEC.md`](./SPEC.md) (the dev lead's brief — distinct from Carl's decisions). Key things the prototype/demo should hit or show a credible path to:

- **Perf targets:** LCP < 2.5 s and INP < 200 ms (receiving/stocktake/dispensing) on a throttled tablet profile; app shell < 1 s from cache; bundle reduced vs current; table benchmark on a **Lenovo M10 gen2**.
- **Hard scope constraints:** no runtime CSS-in-JS, no SSR, no native app, keep current UX/modals, route-based code-splitting.
- **Capability checklist** (responsiveness/tablet, WCAG 2.2 a11y, TMF theming, RTL, plugins, JSONForms' 61 MUI-bound renderers, Command-K, month/year date picker, …) — see `SPEC.md`.

## Done

- Founding architecture doc written and agreed in principle (`2026-06-29_frontend_architecture_direction.md`).
- Context-tracking system set up (`CLAUDE.md` + `DECISIONS.md` + `STATUS.md` + `ARGUMENTS.md`).
- Decided & recorded in `DECISIONS.md`: first slice = **outbound shipment / invoice**; data = **real GraphQL backend + codegen**; framework = **React** (decision #1; Preact as a deferred bundle lever); build engine = **Vite** (decision #2; plugin-load path to be prototyped soon); table lib = **TanStack Table (+ Virtual, + dnd-kit)** (decision #8, built as the Table tab).
- **Scaffolded the new app at [`app/`](./app/)** — Vite 8 + React 19 + TS skeleton (later moved to port **:3010**). `yarn build` (clean `tsc --noEmit`) / `yarn lint` (clean) / `yarn dev` are the verification commands.

### Built in the slice (component storybook — all matched to the real app + faithful `theme.ts` token port; **rem-based** and **RTL-correct** throughout)

- **Sidebar** — docked (Radix **Collapsible** sections, logo toggles an 80px rail) ↔ **hamburger overlay** below 1024 (+ scrim). One component, two modes — no duplicate mobile nav. Real ported SVG icons + logo.
- **Footer** — orange bar; **language selector** (Radix **DropdownMenu**) that flips the whole app **LTR↔RTL** by setting `dir`/`lang` on `<html>` (via `intl/LocaleProvider`); **light/dark theme toggle** (sun/moon) that flips `data-theme` on `<html>` (via `theme/ThemeProvider`).
- **Theming (light + dark)** — attribute-flip over CSS custom properties: a `[data-theme='dark']` override block in `tokens.css` re-values the design tokens, so the whole app recolours with no component changes. Footer toggle, `localStorage`-persisted, default light, pre-paint anti-flash script in `index.html`. **Dark elevation model:** a new `--surface-raised` token (lighter than content in dark) on all floating surfaces + near-black `--shadow-*` overrides, so buttons/menus/dialogs stand out (grey shadows read as a glow on dark). Verified in-browser (flips + survives reload, no flash; buttons + popups lift). Inputs are flat + bordered by design (all four types use `--bg-white` fill; border defines the edge) — the dark `--input-border` override (`#3d3e4c`) was added so they don't draw a harsh near-white edge. Serves the spec's **TMF-theming** criterion; per-org brand themes are the recorded next step (primitive/semantic token split + `color-mix()`). See `DECISIONS.md` (2026-07-01, theming).
- **Header** — breadcrumb (+ section icon), **New shipment** button, **Export split-button** (Radix DropdownMenu), **Filters** menu + inline text / **Status multi-select** filters, and a **centred tab bar with a sliding underline** (Radix **Tabs**, controlled).
- **Content footer** — pinned (non-scrolling) action bar; **blue** (secondary) buttons: History / Cancel / Save. **Save opens a confirm modal** (`ConfirmDialog`).
- **Modals** — reusable `Dialog` (Radix **Dialog**) + `ConfirmDialog` preset ("Are you sure?" / Cancel / OK); the modal usage pattern (local `open` state, declarative render). Wired to Save.
- **Inputs** (tab 1) — `TextField` to the **company input design spec** (default / filled / required / error / disabled / small; orange focus glow), in an intrinsic ≤2-column grid.
- **Selectors** (tab 2) — the "pick from a list" spectrum: **native `<select>`** (plain drop-down), **Radix Select** (styled, colour-dot options), **Downshift combobox** (item autocomplete — filters on code *or* name, two-line options, clearable), **Downshift multi-select** (removable tags, controlled). Sample data shaped like real outbound-shipment items. App-wide `DirectionProvider` (in `LocaleProvider`) makes Radix widgets RTL-aware; demo RTL via the footer language selector. See `DECISIONS.md` (2026-07-01, Selectors).
- **Performance** (tab 5) — the state-management benchmark harness: swappable `StateAdapter` (naive / context-memo / zustand tiers, one form tree), reactive readers, a draggable floating **HUD** (renders-per-interaction, INP p95/max, FPS, long tasks — all production-build-safe), render-flash highlighting, single + side-by-side demo modes, URL params. Dev-tooling, not app chrome. See `DECISIONS.md` (2026-07-01, benchmark harness).
- **Responsive** — intrinsic layout; the *only* breakpoint is nav dock↔overlay (`app/src/styles/breakpoints.ts`). **rem/em everywhere**; phone view scales root to 85%.
- **Bundle now:** **~171 KB gzip JS / ~9.7 KB gzip CSS** (+~42 KB gz from the table: **TanStack Table + Virtual + dnd-kit**, dnd-kit the bulk — the cost of accessible column reorder). Radix primitives in use: **Collapsible, DropdownMenu, Tabs, Dialog, Select, Popover, Direction**. **Downshift** (combobox + multi-select), **TanStack Table/Virtual** (data table), **dnd-kit** (reorder), **`zustand`** (benchmark + selection-footer bridge) all in use. Note: the Performance tab + the table are candidates to lazy-load so they don't inflate the measured app bundle.
- **Reusable UI:** `components/ui/` = `Button` (orange/blue tones), `TextField`, `NativeSelect`, `Select`, `Combobox<T>`, `MultiSelect<T>`, `Tabs`, `Dialog`/`ConfirmDialog`, **`StatusChip`**, shared `Menu.module.css`; **`components/table/` = `DataTable<T>`** (+ HeaderCell, cells, CardList, Pagination, TableToolbar, Checkbox, `useContainerWidth`); **`mocks/`** (InvoiceNode-shaped data); **`stores/selectionFooter`** (zustand); `hooks/useMediaQuery`, **`hooks/useUrlState`** (temporary URL query-param state, pending router #9); `utils/classNames` (`cx`).
- **Touch targets (state to know):** the 48px `@media (pointer: coarse)` bump is ON for nav items, menu items, and text inputs; deliberately OFF for action buttons + tabs (Carl wanted the compact 40px). That's the knob if revisited.

## In progress

- Building the storybook element by element (see "Next element" above). Decisions #1–3 ratified; responsive + rem/em recorded in `DECISIONS.md`. Remaining queue items below are **not** decided.

## Groundwork established (facts, not decisions)

- Schema is checked in at `server/schema.graphql` — types can be generated without running the server.
- The open-mSupply server runs on **:8000** by default; needed only for live data.
- Real outbound-shipment shapes confirmed from `client/packages/invoices/src/OutboundShipment/api/operations.graphql` (`InvoiceNode` → `lines.nodes` → `StockOutLine`).
- App scaffold setup choices (`app/`): **yarn 4** via corepack as a *standalone* project (empty `yarn.lock` marks it separate from the repo root, which has no workspaces), `node-modules` linker + 7-day supply-chain age gate (mirrors `client/.yarnrc.yml`); **TypeScript pinned to ^5.9** (matches the repo, not the brand-new TS 6 — also keeps typescript-eslint happy); dev port **:3010** (deliberately *not* the current front-end's :3003, so both run side by side); **`@/` → `src/`** import alias. Vite config is intentionally minimal + Module-Federation-compatible for the deferred plugin work.

## Decision queue — recommendations unless marked ✓ DECIDED

> Agreed order (Carl, 2026-07-01). Worked through one at a time, each with a proper argument. Notes below are Claude's current recommendation, **not** an agreed choice. Move an item into `DECISIONS.md` only once it's actually decided.

> Order keeps Carl's original six in their relative sequence, with the four additions (★) interleaved where they fit.

1. **✓ DECIDED (2026-07-01): React** — vanilla rejected; Preact held as a deferred bundle lever. Recorded in `DECISIONS.md`; argument in `ARGUMENTS.md` #2.
2. **✓ DECIDED (2026-07-01): Vite** — webpack/Rspack rejected. One carried task: prototype the runtime plugin-load path (Module Federation today) on Vite — see "Next action" and `DECISIONS.md` decision #2.
3. **✓ DECIDED (2026-07-01): UI library & styling** — per-widget hybrid: **Radix** à la carte (hard-but-covered widgets) + **Downshift** (combobox) + **own widgets** (month/year picker, Command-K); styling = **CSS Modules + CSS custom properties** (design tokens). React Aria / Ark / React-Select / vanilla-extract / Tailwind rejected. Recorded in `DECISIONS.md`; argument in `ARGUMENTS.md` #7–9. Bundle/INP to be **measured** in the slice.
4. **State management** — *performance is the priority here* (the original app's core pain). NOT decided — but the **benchmark harness now exists to inform it** (Performance tab; naive vs context-memo vs Zustand, measured render/INP contrast). Zustand leads; ratify once numbers are taken on the target profile. See `DECISIONS.md` (2026-07-01, benchmark harness) and `BENCHMARK.md`.
5. ★ **Forms & validation** — app is form-heavy (the shipment detail is a form); approach ties directly to the re-render/perf concern, so it sits next to state. NOT decided.
6. **Query library (if any)** — e.g. TanStack Query, or none. NOT decided.
7. ★ **GraphQL transport + typed codegen** — distinct from the cache/query lib; the mechanism that delivers end-to-end types from the schema (central to the TypeScript thesis). Pairs with the query lib. NOT decided.
8. **✓ DECIDED (2026-07-01): Table library — TanStack Table (+ TanStack Virtual, + dnd-kit for reorder).** Built as the Table tab (the validation gate) over a real semantic `<table>`; headless engine, our markup/CSS. Sort a11y (`aria-sort` + live region), frozen column (pinning), keyboard resize + reorder, columns/density menus, pagination + virtualised benchmark mode, card-view-as-list, contextual selection footer. Bundle +~42 KB gz (dnd-kit the bulk). **React Aria `Table`** held as the a11y fallback; MRT/AG Grid rejected. Full entry in `DECISIONS.md`; outstanding = Lenovo M10 numbers + a screen-reader audit.
9. ★ **Routing** — list → detail navigation. NOT decided — **recommendation: TanStack Router** (Carl leaning this way, 2026-07-01).
   - **Why it's the lead rec, not a bigger-lib reflex:** the test isn't big-vs-small, it's whether the weight buys something *this* project needs. Carl's stated priority is **URL query params as the primary source of truth**, in a filter-heavy app (status multiselect, date ranges, sort, pagination) — and TanStack Router is built around **typed, validated, serialized search params** (`validateSearch` per route; `useSearch()` returns a typed object; invalid `to`/search is a *compile error*). That's directly on the TypeScript thesis, and its **fine-grained search subscriptions + structural sharing** (a component reading one search key re-renders only when that key changes) make the router part of the **state-management** answer (#4) — URL-backed state that doesn't re-render the world. Route-based code-splitting built in; pairs cleanly with a query lib (#6) instead of competing with it. Coherent with the TanStack Query/Table/Virtual direction (nice-to-have, not the reason).
   - **Carl's three requirements (2026-07-01) — TanStack Router meets all three natively:**
     1. **Automatic parse/stringify of URL params** — `validateSearch` per route (plain fn or Zod/valibot) parses the raw query string into a typed object and serializes back; codec swappable (`parseSearchWith` / `stringifySearchWith`). (Wouter alone: none — raw query string only. nuqs adds this via typed parsers.)
     2. **Referentially-stable params object** *(the discriminator — maps straight onto the re-render thesis)* — TanStack Router's **structural sharing** keeps the parsed search object's identity across updates for the parts that didn't change, so an unrelated param change doesn't hand you a fresh object that re-fires every `useMemo`/`useEffect`/`memo` keyed on it. Enable via `defaultStructuralSharing: true` at `createRouter` (and/or per-hook `structuralSharing: true` with `select`; TS enforces the select result is shareable). Designed-in TanStack Router feature and the strongest project-specific reason to pick it. (nuqs gives stable values **per key** via memoized parsers — covers the common case, but the single-stable-object model as phrased is more naturally TanStack Router's; verify `useQueryStates` combined-object identity if going that route. Wouter alone: hand-rolled `useMemo` keyed on the search string.)
     3. **Normal routing stuff** — nested layouts (`<Outlet>`), typed path params, typed `<Link>` (invalid `to` won't compile), lazy/code-split routes, pending states. (Wouter covers the basics leaner; `React.lazy` code-split is manual.)
   - **Cost (to measure, not assume):** meaningfully bigger than Wouter (order ~10 KB+ gz, tree-shakeable) and a route-tree codegen step (Vite plugin; code-based routing avoids codegen). Settle the same way as the UI-library decision — **measure the real gzipped delta on the tablet profile** in the slice.
   - **Lean fallback: Wouter (~2 KB) + `nuqs`** for typed URL-state — a third of the size if TanStack Router's bytes don't justify themselves. Caveat: verify the `nuqs` ↔ Wouter wiring (its first-class adapters target Next/React-Router/Remix + a generic SPA adapter).
   - **React Router rejected for this project:** its growth (v6→v7 Remix merge) is toward **loaders/actions** (overlap/compete with the planned query lib #6), **SSR/framework mode** (forbidden by `SPEC.md`), and its search params are **untyped** — so most of its added mass is capability we can't use or don't want. That's the "got unnecessarily massive" feeling, correctly diagnosed.
   - The nav components already use router-agnostic `href`/`to` props + `aria-current`, so whichever router wins slots in behind them without rewrites.
   - **Datapoint (built):** filter state is already URL-backed via a temporary `hooks/useUrlState` (History API + `useSyncExternalStore`), so "URL as source of truth" works *without* the router. Whatever router wins must justify itself on typed/path capability, not this — and the swap is mechanical (call sites read/write "URL state"). See `DECISIONS.md` (2026-07-01, filter state in the URL).
10. ★ **Testing strategy** — on-brand with the types/verification thesis (e.g. Vitest + Testing Library). NOT decided.

### Known requirements — consciously deferred (out of prototype scope, not forgotten)

- **i18n + RTL** (12 languages incl. Arabic), **multi-platform** (Electron/Android/Capacitor), **offline/sync**. Acknowledged; not built in the prototype slice.
- **Auth/session** — may need a minimal version just to reach the live server.

> Note (spec): the dev lead's brief treats **responsiveness/tablet, WCAG 2.2 accessibility, TMF theming, and RTL** as evaluation criteria. Even where we don't fully build them in the slice, the demo should **show how the chosen stack supports them**. See `SPEC.md`.
