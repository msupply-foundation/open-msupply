# Arguments — for presenting to colleagues

A curated arsenal of arguments for defending the rewrite-approach decisions to the team. This is **persuasion material** (claims, the reasoning, and rebuttals to likely pushback) — distinct from `DECISIONS.md`, which is the internal record of what we decided. Add to it whenever a strong argument surfaces.

---

## 1. The headline: Claude Code makes TypeScript *more* important, not less

**Claim:** Now that AI is central to our development, types and tests matter more than they ever did — going untyped to "move faster" is exactly backwards.

**Why:**
- AI collapses the cost of *writing* code. It barely touches the cost of knowing code is *correct* or of *safely changing it later*. So effort shifts toward verification and maintenance — the things an untyped clone skips.
- An LLM's dominant failure mode is **plausible-but-wrong** code. TypeScript catches a large share of that *at author time*, locally and instantly. Remove types and the only feedback is "run it and see" — which misses the silent wrong-data bugs that matter most in a stock/dispensing system.
- Types are **machine-checkable contracts**: they're what lets Claude Code change one module and get immediate confirmation it didn't break three others. Without them every AI edit is an unverified guess against an unwritten spec.
- **AI effectiveness is gated by codebase legibility.** If Claude Code is at the heart of our work, we want the codebase that's *most legible to it*: typed, modular, tested. A plain-JS blob is the hardest kind to change safely.
- As AI accelerates output, the ratio of *code-that-exists* to *code-a-human-has-read* drops fast. Types and tests keep the unread majority honest. Without them we accumulate unverifiable code at AI speed — **compounding risk, not compounding leverage.**

**Rebuttal to "but the untyped clone was built in a month":** It optimises month one and taxes every month after. Speed of *generation* was never the main cost of this app.

## 2. React vs vanilla JS — vanilla makes our worst problem *worse*

**Claim:** "React vs vanilla JS" is the wrong question. Vanilla makes our worst problem — hard-to-trace state — *worse*, forces us to hand-roll a buggy framework, and forfeits the AI-legibility and capability ecosystem the rebuild depends on. Stay on React; hold Preact as a cheap, deferred bundle lever.

**Why:**
- **Vanilla doesn't remove the state problem — it removes our *help* with it.** The real pain was never "re-renders," it was hard-to-trace state. Drop the re-render model and the state→UI sync problem remains — except now we hand-write every "when X changes, update these nodes." Loud, profileable re-render bugs become *silent* stale-DOM and listener-leak bugs — strictly worse in a stock/dispensing app where a stale number is a wrong count. At scale we'd grow our own reactivity layer: a bespoke, untested framework we own forever.
- **The performance win is real but small — and recoverable inside React.** The interaction bottleneck on our workflows is large tables (fixed by virtualisation *regardless* of framework), not React's diff. The "whole subtree re-renders" class is killed in React with state colocation, memoisation, and signals (fine-grained reactivity). React's ~40KB is a one-time *cached* cost — that's literally our own "app shell from cache <1s" target — whereas vanilla's bundle grows *faster per feature*, because we'd ship hand-rolled routing, lists, forms, and virtualisation.
- **Preact removes the bundle objection entirely.** `preact/compat` is a build-time alias: same React code, ~a quarter of the size. So we never trade React's ergonomics for bundle size — we keep the ergonomics now and the small-bundle escape hatch open for later.
- **AI legibility needs structural constraints.** AI writes vanilla fine line-by-line — but a framework imposes a *shape* ("component, props, state") that both the model and a reviewer pattern-match against. Hand-rolled vanilla fragments into N private dialects (everyone invents their own list-rendering, input-binding, cleanup), so legibility *drops* exactly where we need "a feature built by one team understood and extended by another."
- **The capability checklist is an ecosystem, not a weekend.** Route-based code-splitting, editable/frozen/keyboard-nav tables, JSONForms, WCAG 2.2, theming, plugins, i18n + RTL, Command-K — each has a mature React solution and must be hand-rolled or wrapped in vanilla. This is the iceberg: the month-long clone replicated the demo surface, not the WCAG keyboard nav or the RTL pluralisation.
- **Transferability.** React is a commodity hire; a bespoke vanilla architecture walks out the door with whoever wrote it.

**Rebuttal to "but vanilla is faster and smaller":** Most of the prototype's speed came from dropping the heavy kit (emotion runtime CSS-in-JS + `material-react-table`), not from dropping React — and we're dropping that kit *either way*. Lean React (headless + light CSS + virtualisation + signals) captures almost all of it; Preact closes the remaining bundle gap with no API change.

**Rebuttal to "if we really want raw perf, go vanilla":** Vanilla is the *worst* way to chase render perf, because you hand-roll the reactivity. The honest perf play is fine-grained reactivity (signals / Solid / Svelte) — and signals work *inside* React, so even the perf argument points to React, never vanilla.

## 3. The pain is how we use the tools, not the tools

**Claim:** Runaway re-renders, "heavy" MUI, and over-complex data hooks are usage/discipline problems — not React, MUI, or TanStack Query problems.

**Why:** Infinite re-renders come from unstable deps and context misuse; "heavy" traces to runtime CSS-in-JS and a heavyweight table lib; the data-layer pain is abstraction piled on top of Query, not Query itself. A rewrite with the same habits reproduces all three in a new codebase.

## 4. Don't big-bang rewrite a 237K-line medical app

**Claim:** A full rewrite is one of the most reliable ways to kill a working product.

**Why:**
- ~237K lines / ~2,700 files / 3 platforms (web, Electron, Android) is realistically multi-person-year work.
- "Replicated most of the functionality and look" is the **visible tip of the iceberg**. Below it: 12-language i18n incl. RTL Arabic, the typed GraphQL contract, offline-first sync correctness, permissions, reports, plugins, the test suite.
- Every odd line usually encodes a real-world rule someone learned the hard way (Chesterton's Fence). "Most" means the rest was silently dropped — and you find out *which* when a health facility hits a wrong count, not in a demo.
- The stack is current (React 19, MUI 6, TanStack 5) — we're not even escaping legacy tech.

**Better path:** incremental, strangler-fig migration — simplify the UI screen by screen behind the existing routes. Each step ships.

## 5. The prototype proves the right thing — just not the thing it's being used to argue

**Claim:** The plain-JS prototype proves **the UI layer can be radically simpler**. It does **not** prove production should be untyped.

**Why:** "Can the UI be simpler?" → yes, and that's genuinely valuable; treat it as a spike / north star. "Should production be untyped?" → no (see argument #1). Rebuild the validated direction *typed and incremental*.

## 6. Simpler UI is the good idea — keep it

**Claim:** Moving to plain HTML + CSS with a few headless components is current best practice and directly attacks the perf complaints.

**Why:** Headless libs (React Aria / Ark / Radix / Downshift, TanStack Table) hand us accessibility, keyboard nav, and focus management for the hard widgets while we own lightweight markup and styling — escaping runtime CSS-in-JS and heavyweight kits without giving up the hard, accessibility-critical work.

## 7. UI library: the choice is per-widget, not a single kit

**Claim:** "Which UI library?" is the wrong framing. The right unit is the **widget**, sorted by how hard its accessibility is — so we buy exactly the hard parts and own the rest.

**Why:**
- Most widgets (modal, dropdown, tabs, tooltip, accordion) are *medium* difficulty — safe to build ourselves on plain HTML + CSS, or take cheaply from a light headless primitive.
- **The combobox/autocomplete is the one genuinely hard widget.** The WAI-ARIA combobox pattern (`aria-activedescendant`, result-count announcements, virtual focus, typeahead, mobile screen readers) is famous for being shipped 90%-right with a broken, untestable 10%. That's the piece worth a dependency.
- So the stack is a **hybrid**: **Radix** à la carte for the hard-but-covered behavioural widgets (Dialog, Popover, DropdownMenu, Select, Tooltip), **Downshift** (~3 KB) for the combobox, and **roll-our-own** for the low-risk widgets (month/year picker, Command-K). Plain HTML for everything else.
- This is *more* on-thesis than picking one kit: we pay only for what's hard, every dependency is tree-shakeable per component ("use one, pay for one"), and we keep full control of markup + CSS.

**Rebuttal to "just use React-Select for the dropdown":** React-Select isn't headless — it ships **emotion (runtime CSS-in-JS)**, which violates the spec's hard constraint and re-imports the exact weight we're escaping (~27 KB+, slow on large lists). Downshift gives the same behaviour headless at ~3 KB.

**Rebuttal to "why not the all-in-one accessible kit (React Aria)?":** It's the gold standard for a11y/i18n, but the heaviest, with a chunkier API and multi-calendar machinery we don't need — and its headline edge (i18n *for free*) mostly doesn't apply to us because our i18n is app-level (see #9). We keep it as the fallback if owning a11y proves too costly to verify, not the default.

## 8. Styling: plain CSS (Modules) + custom properties — the lowest-JS option that exists

**Claim:** CSS Modules + CSS custom properties is the styling method that best fits *both* the perf bar and the "no runtime CSS-in-JS" constraint — and it's the friendliest to designers.

**Why:**
- **Zero runtime style computation.** CSS Modules is plain CSS with build-time class scoping; the only runtime artefact is a tiny class-name map. Nothing computes styles in JS — the opposite of the emotion runtime that made the current app feel heavy.
- **Design tokens are just CSS variables.** The full TMF token set becomes `--color-*`, `--space-*` on `:root`/`[data-theme]`. Theme switching and scoped overrides happen in the browser with **no React re-render** — directly answers "support the full TMF token set, scoped, simple for designers".
- **It's plain CSS designers already know** — no DSL, no utility-class dialect.
- **RTL falls out of logical properties** (`margin-inline-start`, `inset-inline-end`) + `dir="rtl"` — no JS flip step.

**Rebuttal to "vanilla-extract gives typed tokens":** True and tempting, but it's a TS DSL, not plain CSS — more build machinery and a steeper path for designers. Hold it as a fallback only if typed tokens become a must-have. **Rebuttal to "Tailwind is faster to write":** it passes the no-runtime constraint, but it's a big shift away from plain CSS and weaker on the "simple for designers" theming criterion.

## 9. Internationalisation is mostly an app-level concern, not a UI-library one

**Claim:** Worry about i18n shouldn't drive the component-library choice. Most of it lives above the components.

**Why:**
- **Formatting** (numbers, dates, currency, plurals, translated strings) is done with the browser's built-in `Intl` API (zero bundle) + i18next, then we **pass finished strings** to components. The component never needs the locale. This is the bulk of i18n and it's library-independent.
- **RTL layout** is *our CSS* — logical properties + `dir="rtl"` on `<html>`. Also library-independent.
- Only two narrow things actually want library help: **directional component *behaviour*** (dropdown placement / arrow-keys flipping in RTL — Radix's `DirectionProvider` covers its widgets) and **locale-aware input *parsing*** for number/date fields (small for OMS: simple decimals + month/year expiry, so we own it).

**Rebuttal to "but i18n is critical, so we need the heavy i18n-first library (React Aria)":** Critical, yes — but it's mostly delivered by `Intl` + i18next + CSS, not by the widget kit. React Aria's `@internationalized/*` machinery only pays off in locale-aware *input parsing*, a narrow slice of OMS. So i18n importance is real **and** it doesn't force the heavyweight library.

## 10. Responsive: intrinsic layout beats breakpoint soup — and fixes a real current-app weakness

**Claim:** The current app is weak on responsiveness because it drives *layout* with JavaScript and maintains a *separate mobile nav*. The rebuild does responsive with CSS: elements flow and wrap intrinsically, and a breakpoint only ever decides *which element to render*.

**Why:**
- **Layout is intrinsic by default** — flex/grid wrapping, `min()/clamp()`, `auto-fit`, logical properties. No breakpoint is spent nudging spacing or font sizes; the header and footer just wrap when space runs out.
- **Breakpoints do exactly one job:** "docked sidebar vs. hamburger overlay." One value (`1024`), one conditional render, one small matchMedia hook. Everything else is CSS.
- **One nav component, two modes** — the item list is shared verbatim; only the wrapper differs. The current app has a whole separate `MobileNavBar` that re-implements the nav and drifts out of sync. We delete that class of bug.
- **Content responds to its container, not the viewport** — the table's card-view uses container queries, so it reacts to the space it actually has (which changes as the nav docks/undocks), not the raw screen width.
- **RTL stays correct at every size for free**, because the layout is logical-property-based, not hard-coded left/right with breakpoint exceptions.

**The measured kicker:** the entire responsive layer — hamburger overlay, scrim, intrinsic wrapping, touch-target sizing — added **~0.6 KB gzipped**. Responsiveness done in CSS is nearly free; done in JS (the current app) it's re-renders and a second nav to maintain.

**Rebuttal to "you still need breakpoints everywhere for tablet/phone":** No — you need *intrinsic* layout everywhere and a breakpoint in the *one* place the DOM genuinely differs (nav). Reaching for a media query to resize a gap is a smell that the layout isn't intrinsic yet.

## 11. The data table: headless isn't an accessibility *risk* — it's an accessibility *upgrade*

**Claim:** Rebuilding the table on a headless engine (TanStack) over a real semantic `<table>` doesn't gamble accessibility versus the current app — it *improves* on it, while shedding the runtime CSS-in-JS weight.

**Why:**
- **The current table isn't even a real table.** Material React Table runs in `layoutMode: 'grid'` — flexbox over `<div>`s, not `<table>/<th>/<td>` — and ships with `enableKeyboardShortcuts: false`. So a screen reader today doesn't get proper table semantics (row/column headers, cell-by-cell navigation), and there's no keyboard grid nav. We're not starting from a gold standard and risking it; we're starting below the baseline.
- **Native markup buys the hard part for free.** A real `<table>` gives correct screen-reader structure automatically — the exact thing MRT's grid layout throws away. We add the *dynamic* behaviours the platform doesn't: `aria-sort` + a live-region announcement on sort, and keyboard-operable resize/reorder.
- **We buy exactly one hard widget, like we did for the combobox.** Column reorder is the one feature that's dangerous to hand-roll (drag *and* keyboard *and* screen-reader announcements), so we take dnd-kit for it and own everything else. Same "own the simple, buy the hard" rule that governs the whole rebuild.
- **The weight we're escaping is real and measured.** MRT is MUI + emotion (runtime CSS-in-JS) — the single biggest source of the "heavy" feel. The headless replacement renders our own markup with plain CSS; the whole table stack (engine + virtualisation + accessible reorder) is ~42 KB gzipped, and the reorder library is most of that — a line item we can drop if a given deployment doesn't need it.

**Rebuttal to "but MRT gives accessibility out of the box, so rolling our own is the risky move":** MRT gives *widget* affordances out of the box, but configured as it is in our app it forfeits the *structural* accessibility a plain `<table>` has for free — and turns keyboard shortcuts off. The honest comparison isn't "gold-standard MRT vs. our DIY," it's "div-grid with keyboard off vs. a semantic table with sort announcements and keyboard resize/reorder." The rebuild is the more accessible option, not the riskier one.
