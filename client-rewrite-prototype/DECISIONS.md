# Decision log — front-end rewrite prototype

Append-only record of architectural decisions and **why**, including alternatives rejected. Newest at the top. One entry per decision.

> Format per entry: **Date · Decision** — Why · Alternatives rejected · Status.
> This is intentionally a single scannable log (lighter than the repo's dated-ADR files in `/decisions`) because the prototype moves fast. If it graduates to a real project, entries can be split into formal dated ADRs.

---

## 2026-07-01 · Decision #3 ratified — UI library & styling: hybrid headless + CSS Modules with design tokens

- **Decision:** No single component kit. A **per-widget hybrid**, chosen by how hard the accessibility is:
  - **Radix Primitives, à la carte** for the hard-but-covered behavioural widgets — Dialog/AlertDialog (keep modals), Popover, DropdownMenu/ContextMenu, Select, Tooltip, Tabs. Install per-primitive; tree-shakes cleanly (one component ≈ one small package + deduped internals).
  - **Downshift** (~3 KB, headless) for the **combobox / item-autocomplete** — the genuinely hard widget Radix doesn't cover. We own all markup + CSS; we supply the (locale-aware) filter function. Pair with virtualisation (TanStack Virtual) for large item lists.
  - **Roll our own (with Claude)** for the low-a11y-risk widgets — month/year date picker (a 12-cell grid + year stepper, no calendar-grid complexity), Command-K (or tiny `cmdk`), and anything else simple. Plain HTML for everything that's just a button/input/layout/table.
  - **Styling: plain CSS via CSS Modules + CSS custom properties for the design tokens.** Build-time scoping, **zero runtime JS** style computation. The TMF token set becomes CSS variables (`:root` / `[data-theme]`), so theme switching and scoped overrides cost no React re-render. RTL via **logical properties** (`margin-inline-start`, `inset-inline-end`) + `:dir()`, not left/right.

- **Why:**
  - The decision is **per-widget, not global** — the easy widgets (modal, dropdown, tabs) are safe to own; the **combobox is the one genuinely dangerous widget** to hand-roll (WAI-ARIA `aria-activedescendant`, result-count announcements, virtual focus, typeahead — easy to ship 90% right and break the 10% invisibly). So we buy exactly the hard part and own the rest.
  - **Radix is the lightest/most styleable of the credible headless options** and the one Carl is drawn to in principle: minimal real DOM, `data-state`/`data-side`/`data-highlighted` attributes styled by plain CSS, and `asChild` so we own the rendered element. No styling engine, no runtime CSS-in-JS, no i18n bloat. Tree-shakeable per primitive → "use one, pay for one".
  - **CSS Modules + custom properties** is the lowest-JS styling that exists and is *plain CSS designers already know* — directly satisfies the spec's "no runtime CSS-in-JS" hard constraint and "theming simple enough for designers / full TMF token set / scoped where needed".

- **i18n is mostly NOT a UI-library concern** (this is what de-risks dropping React Aria's heavy `@internationalized/*` machinery):
  - **Formatting** (numbers/dates/currency/plurals/translations) is **app-level** — browser `Intl` (zero bundle) + i18next; we pass finished strings to components. Library-independent.
  - **RTL layout** is **our CSS** (logical properties + `dir="rtl"` on `<html>`). Library-independent.
  - Only two narrow things favour a library: **directional component *behaviour*** (placement / arrow-key flip) — Radix's `DirectionProvider` handles this for its widgets; and **locale-aware input *parsing*** for number/date fields — small for OMS (simple decimals, month/year expiry), so we own it. Conclusion: **i18n does not force React Aria.**

- **Alternatives rejected:**
  - **React Aria** (Adobe) — broadest + gold-standard a11y/i18n, but **heaviest** (higher tree-shake floor; `@internationalized/date` carries multi-calendar machinery we don't need) and a chunkier API. Its headline edge (a11y + i18n *without manual work*) is real, but i18n turned out to be mostly app-level for us (above), so we'd be paying for capability we won't use. Keep as the fallback if rolling our own a11y proves too costly to verify.
  - **Ark UI (Zag.js)** — comprehensive one-vendor headless set, but runs state machines internally (more JS per widget) and a smaller ecosystem/AI-training footprint. Backup if Radix's gaps bite.
  - **React-Select** for the combobox — not headless; ships **emotion (runtime CSS-in-JS)** → violates the hard constraint and re-imports the weight we're escaping (~27 KB+, slow on large lists without manual virtualisation). Downshift instead.
  - **vanilla-extract** styling — good, zero-runtime, *typed* tokens, but a TS DSL rather than plain CSS (more build machinery, steeper for designers). Fallback only if typed tokens become a must-have.
  - **Tailwind** — passes the hard constraint (build-time), but a large shift away from plain CSS and weaker on "simple for designers" theming. Not the fit given the plain-CSS bias.
  - **A monolithic component kit** (MUI etc.) — the weight we're rebuilding away from.

- **Validation gates (to measure in the slice, not assume):** real gzipped bundle for the actual set (Radix dialog/popover/dropdown/select + Downshift combobox) vs. estimates; INP on the throttled-tablet profile; that `react-aria-components` isn't needed (so we avoid its floor); the item-autocomplete a11y + large-list virtualisation; and that the custom month/year picker + our own widgets hit WCAG 2.2 without heavy manual work. The MUI-bound JSONForms renderers (61) reuse these same primitives, so the slice doubles as a credibility check on that migration.
- **Status:** Adopted. Build the first slice on this stack to convert estimates into measured numbers.

## 2026-07-01 · Decision #2 ratified — Build engine: Vite (plugin-load path to be prototyped soon)

- **Decision:** Build the new front end with **Vite**. Adopted; the single open risk — runtime plugin loading (below) — is to be **prototyped soon** as the validating spike rather than discovered late.
- **Why:** Fast native-ESM dev server + HMR, minimal config, first-class React/TS support, and a plain static `dist/` output that every existing wrapper consumes unchanged. It's the modern default and the clearest DX step away from the webpack stack we're rewriting off.

- **Concern 1 — stand-alone Capacitor/Android bundle: resolved, non-issue.** Capacitor is bundler-agnostic. `packages/android/capacitor.config.ts` sets `webDir: '../host/dist/'` and `npx cap copy` copies that folder of static assets into the APK; `vite build` produces an equivalent static `dist/`. Repoint `webDir` at Vite's output and it works. To verify during the slice: the asset `base` path (Vite defaults to `/`, which matches today because the bundle is served over http by the Rust server, not from `file://`) and the Electron renderer (it currently has its own webpack renderer config; the Vite SPA feeds it fine, while Electron *main* stays a separate Node bundle). Neither is a blocker.

- **Concern 2 — our runtime plugin system: the one real risk; resolved-with-work.** The plugin architecture is **webpack Module Federation** and is coupled to webpack internals:
  - **Host** (`packages/host/webpack.config.js`) is an MF host sharing `react`, `react-dom`, `@openmsupply-client/common`, and `react-singleton-context` as **eager singletons**.
  - **Plugins** (`packages/plugins/frontend-plugin-webpack.config.js`) are separate MF **remotes** — each its own build, `exposes: { plugin: './src/plugin' }`, consuming those singletons (`requiredVersion: false`). Output is a single bundle (`asyncChunks: false`) that is **synced to devices** and served by the local Rust server.
  - **Runtime load** (`packages/common/src/plugins/pluginProvider.ts`): a `<script>` tag is injected at `${API_HOST}/frontend_plugins/<path>?v=<hash>`, registering a container on `window[code]`; the host then calls the **webpack-specific** `__webpack_init_sharing__('default')` + `container.init(__webpack_share_scopes__['default'])` + `container.get('plugin')`. (Dev mode differs and is already Vite-friendly: local plugins load via a plain dynamic `import()` — no federation.)
  - **Context bridge:** because plugins are bundled separately, React context doesn't cross the boundary for free — the host re-injects it via `react-singleton-context` (`ThemeProviderProxy` / `QueryClientProviderProxy` in `packages/host/src/PluginRoutes.tsx`), itself a shared singleton.

  **Vite can reproduce this**, in order of "closest to today":
  1. **`@module-federation/vite`** — Module Federation 2.0's runtime is decoupled from webpack and powers webpack/Rspack/Vite alike. Rewrite ~one file (`pluginProvider.ts`'s loader) against the MF runtime API instead of the `__webpack_*` globals, and build plugins with the Vite/MF toolchain; the singleton + context-bridge model carries over unchanged. The headline MF-on-Vite limitation ("remotes must be produced by `vite build` because the Vite dev server is bundleless") **does not bite us** — our plugins are always pre-built, synced artifacts, never dev-served as remotes.
  2. **`originjs/vite-plugin-federation`** — community plugin, also supports runtime remotes; `@module-federation/vite` is the more strategic bet.
  3. **Import-maps / native-federation** (`@softarc/native-federation`) — a redesign rather than a port: plugins become plain ES modules sharing the host's React/common via an import map. Lighter and standards-based, but you must deliberately reproduce the `react-singleton-context` bridge and make the import map resolve to locally-synced files for offline. Worth weighing precisely because this is greenfield.

  **Caveats common to the MF routes:** exact React-singleton config (multiple React copies → "Error 321" — the same failure mode already managed today) and rougher HMR/CSS/non-root-base parity than webpack.

- **Out of scope — backend plugins:** the system also has *backend* plugins (ESM modules with hooks, bundled + installed server-side via `remote_server_cli`, run in the Rust server's JS engine). These are not part of the front-end SPA build, so the build-engine choice does not touch them.

- **Validation gate (prototype soon):** before relying on Vite for plugins, stand up a hello-world **remote** plugin built via the chosen Vite route and load it at runtime into the new host sharing a single React. Proving that one path retires essentially all the Concern-2 risk. Note: existing webpack-MF plugin bundles won't load into a Vite host as-is (plugins get rebuilt with the new toolchain), and mixing webpack remotes with a Vite host is fragile — don't.

- **Alternatives rejected:** stay on **webpack** (slower dev, heavier config — the stack we're rewriting away from); **Rspack** (webpack-compatible incl. MF and a smaller migration, but a smaller DX leap than Vite and a smaller ecosystem — reconsider only if the Vite plugin path proves too painful).
- **Status:** Adopted. Plugin-load path to be prototyped soon as the validating spike.

## 2026-07-01 · Decision #1 ratified — React (Preact as a deferred bundle lever)

- **Decision:** Build the new front end on **React**. **Preact** is held as a deferred, measurement-gated bundle-size lever (swap via a `preact/compat` build alias), **not** an up-front choice.
- **Why:** "React vs vanilla" is the wrong question — vanilla makes our worst problem (hard-to-trace state) *worse*, forces us to hand-roll a buggy framework, and forfeits the AI-legibility and capability ecosystem the rebuild depends on. The perf/bundle win that motivated vanilla is mostly from dropping the heavy kit (which we drop anyway) and is otherwise recoverable in lean React; Preact closes the remaining bundle gap with no API change. Full argument: `ARGUMENTS.md` #2.
- **Convention that keeps the Preact switch cheap:** avoid React internals; keep dependencies `preact/compat`-compatible; validate deps + run the test suite under compat before flipping. The cheap-switch property is preserved by discipline, not guaranteed.
- **Alternatives rejected:** vanilla JS (no state model, hand-rolled framework, silent stale-DOM/listener bugs, loses ecosystem + AI legibility + transferability); committing to **Preact up front** (worse DX/devtools, React-centric AI training data, subtle behavioural divergence, no React Compiler / true concurrency — better as a late lever).
- **Status:** Adopted (ratifies the 2026-06-29 React direction).

## 2026-07-01 · Build strategy — a new front-end, grown feature-by-feature, current app as behavioural reference

- **Decision:** Start a genuinely **new** front-end application under the simpler framework — not edits to the existing app in place. Build it **incrementally**: re-implement each piece of functionality one at a time, with the **current codebase as the behavioural reference** (the spec for what each feature must do).
- **Why:** Greenfield and incremental are not in tension — this is both. A clean new app gives us the simpler foundation (perf, bundle, AI-legibility) without inheriting the accumulated complexity, while building feature-by-feature keeps every step shippable, de-risks the migration, and avoids a big-bang feature freeze. Using the old code as the behavioural reference preserves the hard-won real-world rules it encodes (Chesterton's Fence) instead of silently dropping them.
- **Relationship to the founding doc:** Refines its "incremental / strangler-fig" recommendation. The mechanism is a **parallel new app that grows**, rather than swapping components in-place behind the existing routes — but the incremental, no-big-bang, ship-each-step spirit is unchanged.
- **Alternatives rejected:** big-bang full rewrite (multi-year, feature freeze, regression risk — see `ARGUMENTS.md` #3); in-place component-by-component swap inside the current app (keeps us coupled to the existing stack's complexity, the very thing we're escaping).
- **Status:** Adopted.

## 2026-07-01 · First vertical slice = Outbound shipment / invoice

- **Why:** Most representative of the core app, and it exercises the complex item-autocomplete dropdown that was specifically flagged as the key specialised component — so the slice tests the hardest UI problem rather than avoiding it. A list + detail + editable lines + autocomplete covers the full vertical stack.
- **Alternatives rejected:** item master list+edit (too simple, skips the autocomplete); stocktake (decent middle ground but weaker autocomplete test).
- **Status:** Adopted.

## 2026-07-01 · Prototype talks to the real GraphQL backend, with codegen

- **Why:** Validates the real typed contract and data shapes end-to-end — the central TypeScript argument from the founding doc. Mocked data would leave exactly the thing we're trying to prove (typed schema→client safety) untested.
- **Trade-off accepted:** requires the open-mSupply server running locally for live data.
- **Alternatives rejected:** mocked/fixture data (faster, but doesn't validate the contract).
- **Status:** Adopted.

## 2026-07-01 · Styling approach — deliberately deferred

- **Why:** Carl wants styling chosen as its own decision with a proper argument, not defaulted into. Until then the slice will use minimal, neutral, easily-replaceable styling so it doesn't pre-empt the choice (CSS Modules vs vanilla-extract vs Tailwind, or another option).
- **Status:** ~~Pending~~ — **Superseded by Decision #3 (2026-07-01, above): CSS Modules + CSS custom properties.**

## 2026-07-01 · Track context across sessions via CLAUDE.md + DECISIONS.md + STATUS.md

- **Why:** `CLAUDE.md` auto-loads into context every session (incl. fresh ones), so it's the right anchor for surviving session switches — but it degrades if used as a changelog (unbounded growth, context cost, important content buried). Splitting roles keeps the auto-loaded file lean and stable while preserving a full, reviewable history. Docs live in git so they're version-controlled and team-visible.
- **Alternatives rejected:** single large `CLAUDE.md` (rots, costs context every turn); global Claude memory (not version-controlled, not team-visible, not scoped to this folder).
- **Status:** Adopted.

## 2026-07-01 · Build a prototype vertical slice first (not a big-bang rewrite)

- **Why:** De-risks the architecture and proves the simpler-UI direction on real functionality before any commitment. A demoable vertical slice is the cheapest way to get a concrete comparison point. Aligns with the incremental/strangler-fig recommendation in the founding doc.
- **Alternatives rejected:** full rewrite up front (multi-year, feature freeze, regression risk on a medical-grade app); untyped plain-JS clone (optimises month one, taxes every month after — see founding doc).
- **Status:** Adopted.

## 2026-06-29 · Stay on React, with TypeScript mandatory

- **Why:** "React vs vanilla" is the wrong question — vanilla makes our worst problem (hard-to-trace state) *worse* and forces us to hand-roll a framework. React is current (v19), team-known, and supports all three targets. TypeScript is the cheapest verification layer and matters *more* with Claude Code central to development, not less.
- **Alternatives rejected:** vanilla JS (no state model, manual DOM bugs, not transferable); plain JS without types (removes the guardrail that catches AI's plausible-but-wrong output); switching frameworks e.g. Solid/Svelte (fine-grained reactivity is the one real draw, but achievable inside React without a framework swap).
- **Status:** Adopted.

## 2026-06-29 · Simpler UI: plain HTML + CSS + headless components

- **Why:** The original app's "heavy" feel traces to runtime CSS-in-JS and a heavyweight table lib, not to React. Plain markup + lightweight styling + headless libs (React Aria / Ark / Radix / Downshift, TanStack Table) gives control and performance while still handling the hard accessibility/keyboard/focus work for complex widgets.
- **Alternatives rejected:** another monolithic component kit (re-creates the weight we're trying to escape); fully bespoke autocomplete/table from scratch (re-implements solved, accessibility-critical problems).
- **Status:** Direction adopted; specific libraries TBD (see STATUS.md open questions).
