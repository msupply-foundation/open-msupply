# Decision log — Open mSupply front-end rewrite

Append-only record of architectural decisions and **why**, including alternatives rejected. Newest at the top. One entry per decision.

> Format per entry: **Date · Decision** — Why · Alternatives rejected · Status. Same convention as the RnD prototype's `DECISIONS.md` (`/Users/carl/GitHub/open-msupply/client-rewrite-prototype`), which holds the prior decisions this repo builds on.

---

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
