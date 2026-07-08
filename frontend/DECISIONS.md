# Decision log — Open mSupply front-end rewrite

Append-only record of architectural decisions and **why**, including alternatives rejected. Newest at the top. One entry per decision.

> Format per entry: **Date · Decision** — Why · Alternatives rejected · Status. Same convention as the RnD prototype's `DECISIONS.md` (`/Users/carl/GitHub/open-msupply/client-rewrite-prototype`), which holds the prior decisions this repo builds on.

---

## 2026-07-08 · Content footer — `contentFooter` shell slot; contextual content by composition, not a store

- **Decision:** The last layout element from the prototype week, the **content footer** (the pinned blue-buttons action bar), lands as two hand-rolled components in `components/layout/ContentFooter/` — `ContentFooter` (the strip) + `ContentFooterActions` (the inline-end cluster) — with exactly the Header family's contract: one flat flex-wrap container, parts self-slot via their own CSS (`margin-inline-start: auto`, the HeaderButtons mechanism), zero state, page owns all content and handlers. `AppShell` gains a **`contentFooter?: JSX.Element` slot prop** (the mirror of `header`, same rationale as that entry): the shell pins the composed bar between the scrolling body and the orange app footer, so it never scrolls with the page.

- **Contextual content stays, the store goes.** Carl's one-bar rule from the prototype (2026-07-01: one pinned bar whose *content* is contextual — detail actions ↔ selection actions — so two rows of blue buttons never stack) is preserved, but the prototype's mechanism (a zustand `selectionFooter` store bridging table → footer) is **not carried over**. The page swaps the bar's children with a plain `<Show>` on its own selection signal. Why: the store was React-era plumbing for getting selection state out of a distant table component; in our structure the page owns both the table state and the bar it passes to the shell, so a local signal covers it — and the library keeps its rule that layout elements carry no app state. **Revisit** when TanStack Table lands: if selection turns out to live inside a table component, decide then how it reaches the page (probably a controlled `onSelectionChange`, still no global store).

- **Alternatives rejected:** a library-level selection-footer primitive (speculative before the table exists); the shell rendering the bar itself from action props (a demo-shaped API — exactly what the separation entry below removed from AppShell); `<footer>` markup for the bar (the orange app bar is the page's one footer landmark; the content footer is an action strip, so it's a plain `<div>`).

- **Status:** Adopted. Demoed standalone (new **Content footer** showcase section, replacing the empty "Layout" placeholder — Header / Content footer / App shell each have a section now) and live in the App shell demo (row selection swaps the bar; Delete really deletes). Save's confirm dialog is deliberately not ported — Dialog arrives with the Feedback/basic components.

## 2026-07-08 · Header replaces the shell's hard-coded header — `header` slot prop, shell-context hamburger, breadcrumb leaf is the page's h1

- **Decision (Carl: "replace the hard-coded in both"):** `AppShell`'s built-in header row (navModel-derived crumbs + placeholder search/New button) is deleted. Integration mechanics (resolving the open questions in the entry below):
  - **Slot prop:** the shell gains `header?: JSX.Element`; the page composes `<Header>…</Header>` and passes it in, and the shell pins it in the main column above the scrolling body — the fixed-header/scrolling-body guarantee stays with the shell.
  - **Hamburger via context:** the overlay hamburger moves *inside* `Header` (start of the strip). New `ShellNavContext` (`isOverlay`, `openNav`) provided by `AppShell`, consumed by `Header` — the shell owns the state, the header owns the spot. A `Header` outside any shell (the showcase panel) has no provider and never shows one. Consequence, documented on the prop: a full-bleed page **must** pass a header, or narrow viewports have no way into the nav.
  - **Breadcrumb leaf is now the page's `<h1>`** (was a prototype-faithful span): deleting the shell header would otherwise leave pages with no h1 at all (the old `crumbLeaf` was it). Styled as an ordinary crumb (UA h1 size/weight/margins reset); pages must not render another h1.
  - **Crumb derivation moves to the pages** (`findNavParent` + selected leaf, in `pages/Home` and the App shell demo) — the exact job a router takes over later. The demo's filter strip moved from the body into the header's `<Toolbar>`, completing the AppBar shape.

- **Why slot prop over the alternatives flagged earlier:** it's the smallest mechanism that works with the current pages-render-the-shell pattern and keeps scroll ownership in the shell. Page-renders-Header-in-body was rejected because the body is the scroll region — the header would scroll away, or every page would have to re-implement the fixed/scroll split; portals (the current app's model) buy nothing while pages can reach the shell's props directly. **Known revisit:** under a future router-outlet layout a page can't pass props to the shell — re-evaluate (likely: keep `Header` as-is, move where it's mounted) when routing is decided.

- **Status:** Adopted. `pages/Home` and the App shell showcase demo both compose their own `Header`; the shell's placeholder search/New button are gone (real search comes back as a designed component when a page needs it).

## 2026-07-08 · Page-header family (Header / Breadcrumb / HeaderButtons / Toolbar) — flat children, self-slotting CSS, page owns all state

- **Decision:** The page-top layout atom is four hand-rolled components in `components/layout/Header/`, composed exactly as Carl specified: `<Header><Breadcrumb/><HeaderButtons/><Toolbar/></Header>`. `Header` is a single flex-wrap `<header>` strip with **no nested row markup** — the parts pin themselves via their own CSS (`HeaderButtons` → `margin-inline-start: auto`; `Toolbar` → `flex-basis: 100%` for its own full-width row). **State ownership:** all four are stateless. The page owns the crumb trail (a plain `crumbs` prop — a router derives it later), the action buttons and their handlers, and the entire toolbar content; `Header` only claims the rows.

- **Why:**
  - Keeps the sketched flat composition API while staying robust to omission — any part can be left out and the rest still lands correctly (auto margin pins buttons to inline-end even with no breadcrumb beside them).
  - **Flex-wrap, not grid-template-areas:** the prototype's responsive decision for shell chrome is intrinsic wrap (buttons drop below the breadcrumb when squeezed — no breakpoints, principle #7), and named grid areas can't reflow across rows. This is why the parts self-slot instead of being placed by the container.
  - `Toolbar` is deliberately **not** `role="toolbar"` — that ARIA role demands arrow-key roving focus between controls, which would be wrong for a loose strip of filters.

- **Deltas from the prototype (deliberate):** flat three-children structure (prototype nested `.topRow`/`.lead` wrappers); a wrapped button cluster hugs **inline-end** (prototype: start) — reads as more intentional; `Header` owns its `border-block-end` (the prototype's bottom edge came from its tab strip, which isn't ported); `Breadcrumbs` renamed `Breadcrumb`; the export split-button is our generalised `SplitButton` rather than the bespoke `ExportButton`.

- **Alternatives rejected:** named slot props (`<Header breadcrumb={…} buttons={…}>`) — more explicit but a heavier API for no behavioural win, and deviates from the agreed composition; grid-template-areas with children self-assigning areas — order-independent but can't wrap intrinsically (see Why); portals for buttons/toolbar (the current app's `AppBarButtonsPortal` model) — machinery that's only necessary when pages can't reach the header directly, which isn't our structure.

- **Open questions (Carl):** (1) **AppShell integration** — the shell still renders its own hard-coded header row (crumbs + placeholder search/New) and owns the overlay hamburger; how `Header` replaces that row (slot prop vs. shell context with the page rendering `Header` in the body vs. portal) interacts with the routing decision, and the header must stay fixed while the body scrolls. (2) Whether the breadcrumb **leaf should be the page's `<h1>`** — AppShell's current crumb leaf is an h1; the prototype's was a plain `aria-current` span, copied faithfully here.

- **Status:** Adopted for the showcase (new **Header** section). Shell integration deliberately not attempted yet.

## 2026-07-08 · Library / showcase / pages separation — AppShell gets a real app-facing API

- **Decision (Carl):** The reusable library and the showcase are strictly separated, with a third home for real application pages:
  - **`src/components/` + `src/hooks/` + `src/styles/`** — the reusable library. Imports **nothing** from `src/showcase/` or `src/pages/`, and carries no demo state, demo defaults, or demo-shaped APIs.
  - **`src/showcase/`** — *all* storybook scaffolding, including the storybook shell itself (`ShowcaseApp.tsx`, moved from `src/App.tsx`; `src/index.tsx` mounts it while the library is the app — the real app takes over the entry point later).
  - **`src/pages/`** — real application pages, importing only from the library. First page: **`Home`** (`#/home`, full-bleed) — the actual home-page scaffold: AppShell + an empty body, proving the shell mounts with zero showcase ceremony. Real pages register with **`kind: 'app'`**: full-bleed with *no* showcase chrome at all — not even the floating ShowcaseLauncher that `kind: 'page'` demos get (Carl: the real page must look exactly as a build would ship it). The way back to the showcase is the browser's Back button, as in a real app.
  - **`AppShell` is now a controlled, pure layout element:** plain `children` (was a render-prop that existed only so demo content could react to nav clicks), `selected`/`onNavigate` props (was internal state with a hard-coded "Outbound Shipments" default), and the header breadcrumb derived from `navModel` via `findNavParent` (was a hard-coded "Distribution"). The demo ceremony moved into `PageLayoutShowcase`, which now owns its own selection signal — exactly the role a router will play in the real app.

- **Why:** Others are about to build the rest of the app on these components; anything demo-flavoured in the library's APIs becomes load-bearing the moment they do. Showcase→library imports were already one-directional, but AppShell's *shape* was a showcase construction — state ownership and defaults chosen for the demo, not the app. Controlled selection + plain children is precisely what route-driven usage will need.

- **Alternatives rejected:** keeping the render-prop `children` (couples the shell to a demo need; a router drives selection from outside anyway); leaving the storybook shell at `src/App.tsx` (showcase scaffolding squatting on the real app's entry point); a barrel `src/components/index.ts` for nicer import paths (deferred, not refused — paths are shallow today and a barrel is one more thing to maintain; revisit when the library surface stabilises).

- **Status:** Adopted. `#/home` is the reference for how pages are built until routing is decided.

## 2026-07-08 · No hard-coded colours in component CSS — every colour derives from a token

- **Decision (Carl):** Component CSS may not contain colour literals (`#hex`, `rgb()/rgba()`, `hsl()`, named colours). Every colour is `var(--token)`, or `color-mix(in srgb, var(--token) N%, transparent)` for tints. **White included** — content on a coloured fill is `var(--primary-contrast)`, never `#fff`. Colour literals live only in `src/styles/tokens.css`, where the palette is defined. If a needed colour has no token, **add one to the theme contract** (with a dark override) instead of inlining a literal. Recorded as an addendum to principle #5 in `CLAUDE.md`.

- **Why:**
  - Literals silently opt out of theming: they look right in light mode and wrong (or invisible/low-contrast) in dark, precisely the bug class the theme contract exists to prevent. Tokens carry the AA contrast pairs in both themes (principle #9).
  - The RnD prototype — our main porting source — hard-codes whites and low-alpha `rgba()` tints (button on-fill text, ripple colours, the TextField error glow), so unreviewed ports import violations by default. Carl caught exactly this in the ported buttons (`#fff` on the hover fills).
  - **Tooling gap, known:** stylelint's unknown-`var()` check validates token *references*, but nothing flags colour *literals*. Until a lint rule is added (candidate: `color-no-hex` + a declaration-property allowlist — needs care around `tokens.css` itself), the check is manual: grep new CSS for `#` / `rgb(` / `hsl(`.

- **First applications:** the Button/SplitButton whites → `var(--primary-contrast)` (retro-fixed same day); TextField's error focus glow → new **`--focus-ring-error`** contract token (light `rgba(230,53,53,.2)`, dark `rgba(255,95,95,.4)` — stronger on dark, mirroring `--focus-ring`'s 0.25→0.45), rather than the prototype's inline rgba.

- **Alternatives rejected:** inline `color-mix` over `--error-main` for the error glow — keeps the hue themed but pins the *strength*, and the existing `--focus-ring` precedent is that glow strength is a themed value; a blanket stylelint ban now — right direction, but needs configuration thought (tokens.css exemption), so deferred rather than half-done.

- **Status:** Adopted; rule live in `CLAUDE.md` principle #5. Automated lint enforcement is an open candidate — confirm approach with Carl.

## 2026-07-08 · Button family (Button + SplitButton) — hand-rolled, with the click ripple as the one deliberate JS-for-interaction exception

- **Decision:** The action buttons from last week's demo are ported to Solid as two hand-rolled elements plus shared ripple infrastructure:
  - **`Button`** — a plain `<button>` + CSS Modules, `data-color` selecting the tone (**orange** brand default / **blue** action), optional leading icon. No component library: a native button already carries role, accessible name, keyboard operability and `disabled`.
  - **`SplitButton`** — our two-half markup + CSS over **Kobalte DropdownMenu** for the caret's menu (main half runs the selected action; a menu pick selects *and* runs it).
  - **`createRipple` + `Ripple`** — the MUI-style click ripple, and the **single place we use JavaScript for interaction** in the whole app.

- **Why:**
  - `Button` is exactly principle #1 ("own the simple"): a styled native button owes no a11y contract worth buying. `SplitButton` is principle #2 ("buy the hard") applied only to the caret's menu popup — the same focus/type-ahead/keyboard call already made for the footer LanguageSelector (see the entry below), reusing the Kobalte dependency already in the tree. Solid ports of the prototype's `<Button>` and `ExportButton`.
  - **The ripple is the documented exception to "interaction is pure CSS."** It must originate at the exact pointer coordinates, which CSS cannot read; so JS supplies each ripple's position/size and spawns one element per click, while the animation itself stays CSS. Kept tiny and isolated in `createRipple`, and skipped entirely under `prefers-reduced-motion`.
  - **Ripple position/size are the rare legitimate px in TSX** — they're measured pixel offsets from the pointer, not layout spacing, so the rem rule (#6) doesn't apply. Everything static stays rem/tokens.

- **Deltas from the prototype (small, deliberate):**
  - Ripple tints use `color-mix(in srgb, <token> 22%, transparent)` instead of the prototype's hard-coded `rgba(...)`, so they derive from the palette tokens and **track the theme** (the repo's established tint pattern — same as the footer/divider tints).
  - Radius uses the `--radius-button` token rather than a literal `1.5rem`.
  - `SplitButton`'s caret open state is styled via Kobalte's `data-expanded` (the prototype's Radix used `data-state='open'`); `ExportButton` is generalised into a reusable `SplitButton` (options + `onAction`/`onValueChange`).
  - `--ripple-color` is a cross-component contract var (a button sets it, `Ripple` reads it), so it's allow-listed in `.stylelintrc.json` alongside the Kobalte popper var.

- **Alternatives rejected:** a CSS-only "ripple" (e.g. radial-gradient on `:active`) — can't originate at the click point, reads as a flash not a ripple; a MUI/other button component — rejected by principles #1–3 (opinionated look, unnecessary dependency); hand-rolling the caret menu — rejected by #2 (the keyboard/focus contract is the buy-don't-build part).

- **Status:** Adopted for the showcase (new **Buttons** section). Faithful Solid re-authoring of last week's demo, flagged for Carl's review of the rendered result.

## 2026-07-08 · Footer language selector (Kobalte DropdownMenu) + document-level RTL flip

- **Decision:** The footer language picker is built on **Kobalte DropdownMenu** (headless), styled to our look via `data-*` attributes, opening upward out of the footer (`placement="top-start"`). The list is the current app's native-name language options with the RTL locales (`ar`/`prs`/`ps`) tagged. Selecting an RTL locale flips the whole app to RTL by setting `dir="rtl"` on **`document.documentElement`**; `AppShell` restores `ltr` on unmount.

- **Why:**
  - Extends the existing "buy the hard a11y contract" call (see 2026-07-07 Kobalte entry): a menu popup's focus management, type-ahead and arrow/Escape nav are the dangerous-to-hand-roll part, and Kobalte is already in the tree. Solid analogue of the prototype's Radix DropdownMenu.
  - **Document-level `dir`** (not a scoped container) so *portaled* popups — the menu itself, and any Select/Combobox content in `<body>` — inherit RTL too. Logical properties + `:dir(rtl)` rules across the app then mirror everything with no extra work; this is what exercises principle #8 end-to-end.
  - **Reset-on-unmount** keeps RTL scoped to viewing the full-bleed page, so returning to the LTR component showcase is clean.

- **Alternatives rejected:** scoping `dir` to the `AppShell` root div — better isolation, but portaled menus live in `<body>` and wouldn't inherit it, rendering LTR-misaligned over an RTL page; hand-rolling the menu — rejected per principle #2 (the keyboard/focus contract is the buy-don't-build part).

- **Status:** Adopted for the shell demo. The switch is display-only (native names + `dir`); no i18n message catalogue yet.

## 2026-07-07 · Whole-page layouts shown via full-bleed takeover, not an iframe canvas

- **Decision:** The showcase demonstrates whole-page layouts (the app shell, with its own sidebar/header/footer) by a **full-bleed takeover**: a section marked `kind: 'page'` renders edge-to-edge and owns the real browser viewport, with the showcase chrome replaced by a single floating **ShowcaseLauncher** (bottom inline-start, above the shell's overlay scrim) as the way back to the menu and the theme toggle. Mechanically: `SectionDef` gains a `kind` field, `App.tsx` branches on it with `<Show>`, and the launcher reuses the existing hash nav. The first such page is the `AppShell` layout element; the responsive docked-vs-overlay decision is driven by `createMediaQuery`/`useIsNavOverlay` against `breakpoints.navOverlay` (1024) with the phone shrink at `compact` (600).

- **Why:**
  - The whole point of showing a page layout is to **resize and device-test it** — watch the docked sidebar become a hamburger overlay at 1024px and the whole UI shrink at 600px. Full-bleed lets the page own the actual viewport, so the browser's own device toolbar and window resizing drive the real media-query breakpoints directly (Carl's call: "we need to switch the viewport to mobile view and try it out in various sizes, so with an extra frame around it that'll be silly").
  - **Same document = free theming.** The page shares `data-theme` on `<html>` and the token cascade with the rest of the app; no cross-frame theme sync, no second Vite entry, no bundle duplication.
  - It's a tiny, dependency-free addition to the existing hash-nav shell — one `<Show>` branch and a floating popover — with no routing library (still undecided).

- **Alternatives rejected:**
  - **Iframe canvas (Storybook's approach)** — gives true viewport isolation and CSS sandboxing, and would even allow an in-page viewport-preset selector. Rejected because it *defeats the primary use case*: an inner iframe viewport doesn't track the browser's device emulation, so you'd be testing a frame-in-a-frame, and it adds a second HTML entry plus `postMessage`/storage-event theme sync. Recorded fallback: revisit if we ever need to preview several page sizes side by side on one screen.
  - **Route-based full pages + persistent launcher** — cleaner URLs, but needs a router (undecided) and is heavier than a hash flag for what is still a showcase.

- **Adapted from the prototype (per CLAUDE.md copy-confirm rule):** `AppShell` and `Sidebar` follow the RnD prototype's React shell (docked rail / off-canvas overlay + scrim, `navModel`, `useMediaQuery`), re-authored in Solid idioms (signals + `<Show>`/`<For>`, `data-*` state attributes, logical properties). Built fresh, not copied verbatim — **flagged to Carl for confirmation.** Deltas: collapsible nav sections are a plain signal + `<Show>` rather than a Collapsible primitive (no ARIA/focus contract worth buying for show/hide), and nav items are inert `<button>`s pending a routing decision.

- **Status:** Adopted for the showcase. AppShell/Sidebar pending Carl's review of the shell itself and a later routing decision (which will make nav items real links).

## 2026-07-07 · Kobalte as the headless primitive for the selector family (Select, Combobox, MultiSelect)

- **Decision:** The three rich selector widgets — styled drop-down, autocomplete/combobox, multi-select autocomplete — are built on **`@kobalte/core`** (Select and Combobox primitives), replacing the prototype's React-only picks (Radix Select + Downshift). We own all markup and CSS; Kobalte supplies behaviour + ARIA, styled through its `data-*` state attributes (`data-highlighted`, `data-selected`, `data-expanded`, `data-placeholder-shown`) — the same styling contract as Radix.

- **Why:**
  - These are exactly the widgets principle #2 says to buy: the WAI-ARIA combobox/listbox contract (`aria-activedescendant` virtual focus, screen-reader announcements, typeahead + arrow/Home/End/Escape semantics) is the thing that's dangerous to hand-roll — the same argument recorded for Radix/Downshift in the prototype's `UI_ELEMENTS.md`.
  - **One dependency covers both roles**: Kobalte's Select replaces Radix Select, and its Combobox (single + `multiple`) replaces both Downshift hooks. Bonus over Downshift: the popup is portaled with collision-aware, control-width popper placement (verified: flips upward near the viewport bottom — the prototype had deferred this to "a Radix Popover later"), and filtering is built in (we still pass the predicate).
  - Closest Solid analogue of Radix (WAI-ARIA implementation, headless, `data-*` state attributes, active maintenance, MIT), already flagged as the front-runner in `CLAUDE.md`.
  - Verified against the installed types/source (v0.13.12), not docs alone: value model, filter bypass on trigger-open, `removeOnBackspace`, `sameWidth` defaults.

- **Behavioural deltas from the prototype accepted knowingly:**
  - Multi-select: picked items **stay in the list check-marked** (click to deselect) rather than dropping out — Kobalte resolves its controlled value against `options`, so removing selected items from the list would break selection state; keeping them is also the standard WAI-ARIA multi-combobox model.
  - Kobalte's value model is the option **object** (not a string), and its filter is a **per-item predicate** (not whole-list). Component APIs mirror the prototype's (string `value` for Select, `itemToString` etc.) with the mapping done inside; Combobox/MultiSelect add an `itemToValue` prop because Kobalte keys options by a unique string.
  - One vendor CSS custom property (`--kb-popper-content-available-height`) is allow-listed in `.stylelintrc.json` for popup max-height.

- **Alternatives rejected:** **corvu** — no combobox, so it can't cover the hardest widget; **Ark UI (Zag.js)** — capable but a heavier framework-agnostic state-machine abstraction for the same contract; **hand-rolling** — rejected for these specific widgets by principle #2 (it's the 10%-that-matters a11y work); **Downshift/Radix** — React-only, not usable from Solid.

- **Status:** Provisional — built at Carl's request to evaluate the Kobalte equivalents of last week's three selects; per-widget adoption argument stands, pending his review of the rendered result. Native `<select>` (the default for short fixed enums) is deliberately not ported yet.

## 2026-07-06 · Styling: bare CSS Modules + custom properties, with integrity tooling (vanilla-extract rejected)

- **Decision:** Styling is **plain CSS via CSS Modules + CSS custom properties for design tokens** — the same approach validated in the RnD prototype — rather than **vanilla-extract** (`@vanilla-extract/css`). The compile-time safety vanilla-extract would have provided is instead recovered with three pieces of cheap, dependency-light tooling:
  1. **Typed class names** — `typed-css-modules` generates a `.d.ts` beside every `*.module.css` (gitignored; regenerated in watch mode during dev and as the first step of `npm run check`), so `styles.buton` fails `tsc -b` and squiggles live in the editor via the TS language server.
  2. **stylelint + `stylelint-value-no-unknown-custom-properties`** — property-name typos, malformed values, and any `var(--x)` not declared in `tokens.css` are errors, live in the editor (stylelint extension) and in CI.
  3. **Theme-contract script** (`scripts/check-theme-tokens.mjs`) — `tokens.css` delimits a "theme contract" region; the script fails if any `[data-theme]` block misses a contract token or overrides a token that doesn't exist. This is vanilla-extract's `createThemeContract` replicated in ~60 lines, and it targets a real observed bug class: the prototype's dark theme shipped with every border token overridden *except* `--input-border`.

  All three run in one command — **`npm run check`** (regen CSS types → `tsc -b` → stylelint → theme contract) — which is the mandatory post-change verification for agents and the CI gate for everyone.

- **Why:**
  - **The plain-CSS thesis holds.** The whole stack argument (prototype Decision #3) is built on plain semantic HTML + plain CSS that humans, designers, and LLMs all know natively. vanilla-extract is a TS DSL — camelCase properties, `selectors: {}`, `globalStyle()` — so every snippet from MDN, the current app, or the prototype needs translation, and the prototype's entire CSS estate would be ported rather than copied.
  - **LLM authorship cuts both ways, and lands here.** Most CSS going forward will be written by Claude Code. That argues *for* machine verification (vanilla-extract's case) — but LLMs are strongest where training data is deepest, and plain CSS outweighs the vanilla-extract DSL by orders of magnitude. The deciding point: the verification gap closes with the tooling above at ~5% of the DSL's cost, and an LLM workforce is exactly what makes such small tools cheap to build and maintain. The agent's real feedback loop is running `npm run check` (plus IDE diagnostics surfaced by the editor) — identical under both approaches.
  - **Zero styling dependencies at runtime or build.** CSS Modules are native to Vite; vanilla-extract needs `@vanilla-extract/vite-plugin`, a single-vendor project that has historically lagged new Vite majors (we're on Vite 8). The dev lead's spec explicitly scores dependency count and supply-chain risk. Our added tooling is dev-only (`typed-css-modules`, `stylelint` + one plugin).
  - **Runtime theming is CSS variables regardless.** The theming mechanisms carried from the prototype — `data-theme` attribute flip, and per-tenant TMF themes where runtime seed tokens + `color-mix()` derive the palette — are natively custom-property territory. vanilla-extract would be a typed wrapper around the same vars: DSL cost without displacing the mechanism.
  - **Reviewability.** Humans review LLM-written CSS; plain CSS diffs are readable by anyone, including designers (a spec criterion for theming).

- **What we consciously give up vs. vanilla-extract:** the single unified TS channel for all style errors with zero setup. Our equivalent is assembled from two channels (TS for class names, stylelint for CSS internals) plus a watch task — near-identical coverage, slightly more assembly. The theme-contract check has no live editor squiggle (CLI/CI only) — acceptable because theme blocks change rarely and locally. Typed *refactors* of token names (TS rename) are also lost; find-and-replace + the stylelint var() check catch the fallout instead.

- **Validation coverage, by failure mode:**

  | Failure mode | Editor (live) | `npm run check` / agent loop | CI |
  |---|---|---|---|
  | `styles.buton` in TSX | TS squiggle (needs `tcm --watch`) | `tsc -b` after type regen | ✅ |
  | `var(--token-typo)` in CSS | stylelint squiggle | stylelint | ✅ |
  | CSS property typo / bad value | stylelint squiggle | stylelint | ✅ |
  | Theme block missing a contract token | — | contract script | ✅ |
  | Compiles clean but looks wrong | human eyes on dev server | agent screenshot/verify loop | — |

  The last row is the honest gap for *both* approaches — no static tool validates visual correctness. Human flow: dev server + eyes. Agent flow: run the app and visually verify changes with visual surface; visual regression testing is a possible later addition.

- **Alternatives rejected:** **vanilla-extract** — genuinely on-thesis in one respect (typed tokens + theme contracts = the "TypeScript verifies LLM output" argument) and zero-runtime, so it passes the spec's no-runtime-CSS-in-JS constraint; rejected for the DSL translation tax, the added build dependency on a plugin with Vite-major lag risk, and because its safety wins are reproducible with small tools. **Recorded fallback:** revisit if per-tenant TMF theming grows complex enough that contract enforcement becomes a must-have rather than a nice-to-have, or if the tooling proves flaky in practice. (Tailwind, runtime CSS-in-JS, and monolithic kits were already rejected in the prototype's Decision #3 — reasoning unchanged.)

- **Status:** Adopted. Tooling to be set up alongside the tokens/root-stylesheet import (first todo).
