# Conversation log — repo setup & styling decision (2026-07-06)

## The vanilla-extract vs CSS Modules question

**Carl:**

We need to resolve a design choice before proceeding -- whether to use @vanilla-extract/css to get type-safe CSS and theme tokens, or just do bare CSS Modules like i did in the demo last week. Please give me the pros and cons of each, and you recommendation. Bear in mind that most CSS code going forward will be written by Claude Code or another LLM, if that affects the recommendation at at all

**Claude:**

Here's the analysis on vanilla-extract vs bare CSS Modules.

### vanilla-extract (@vanilla-extract/css)

**Pros**

- **Typed tokens and styles, checked by `tsc`.** A mistyped token name or a reference to a deleted style is a compile error. With plain CSS, `var(--color-primary-drak)` silently resolves to nothing — the classic LLM plausible-but-wrong failure, invisible until someone looks at the screen. This aligns directly with your founding thesis that TypeScript is the verification layer that makes AI-assisted development safe.
- **Theme contracts.** `createThemeContract` forces every theme to supply every token. This isn't hypothetical for you: last week's dark theme shipped with exactly this bug — every border token was overridden *except* `--input-border`, leaving near-white edges on dark inputs. A theme contract turns that whole bug class into a compile error.
- **Zero runtime** — it compiles to static CSS, so it passes the spec's "no runtime CSS-in-JS" hard constraint.
- **Typed refactors**: rename a token via TS rename and every usage updates; unused styles are findable.

**Cons**

- **It's a TS DSL, not CSS.** camelCase properties, string values, `selectors: {}`, `globalStyle()` for anything global. Every snippet from MDN, the old app, or last week's demo needs translation, and the demo's ~20 `.module.css` files would all be ported rather than copied.
- **Build machinery and dependency risk.** Needs `@vanilla-extract/vite-plugin`; it's a single-vendor project that has historically lagged new Vite majors, and you're on Vite 8. The spec explicitly scores dependency count and supply-chain risk; CSS Modules need zero added dependencies (native in Vite).
- **Runtime theming ends up as CSS variables anyway.** Your planned mechanisms — `data-theme` attribute flip, and per-tenant TMF themes where a seed colour is set at runtime and `color-mix()` derives the rest — are natively CSS-custom-property territory. vanilla-extract supports this, but it becomes a typed wrapper around the same vars, so you pay the DSL cost without displacing the underlying mechanism.
- **Less reviewable by designers/humans.** Plain CSS diffs are readable by anyone; the DSL adds a ramp for designers and reviewers — and the spec calls for theming "simple enough for designers."

### Bare CSS Modules + custom properties

**Pros**

- **Plain CSS**: maximal familiarity for humans and, importantly, the deepest LLM training-data coverage of any styling approach that exists. Zero translation from any reference material, including the entire demo from last week.
- **Zero added dependencies**, native Vite support, fast builds, no version-compat risk.
- **Proven**: the entire prototype — tokens, dark theme, elevation, RTL, responsive — was built this way and it worked well.
- **Natural fit with the headless approach**: Kobalte (like Radix) exposes state as `data-*` attributes designed to be styled by plain CSS selectors, and variants-as-data-attributes is a clean pattern LLMs execute reliably.

**Cons**

- **No compile-time verification out of the box.** Three silent failure modes: token-name typos in `var()`, class-name typos in TSX (`styles.buton` is just `undefined`), and incomplete theme override blocks (the `--input-border` bug).
- Refactors are find-and-replace rather than typed.

### The LLM consideration — it cuts both ways, and it's the crux

The argument *for* vanilla-extract is that LLM output needs machine verification. The argument *against* is that LLMs are strongest where training data is deepest, and plain CSS outweighs the vanilla-extract DSL by orders of magnitude. But the decisive point: **the verification gap can be mostly closed with cheap tooling while keeping plain CSS**, and an LLM workforce is precisely what makes such tooling cheap to build and maintain:

1. **Typed class names**: generate `.d.ts` files for `*.module.css` (e.g. `typed-css-modules` as a dev script) so `styles.buton` fails `tsc -b` in CI — this closes the biggest gap for free.
2. **Token-completeness check**: a ~50-line script that parses `tokens.css` and fails CI if a `[data-theme]` block misses a token that themes are expected to override, and if any `var(--x)` in the codebase references an undeclared token. That's the `--input-border` bug class caught at build time, without a DSL.
3. Optionally **stylelint** for property-name typos and convention enforcement (rem-only, logical properties).

That combination gets you roughly 80% of vanilla-extract's safety at roughly 5% of its cost, with no new runtime-adjacent dependency and no translation tax on everything you copy from the demo.

### Recommendation

**Bare CSS Modules + custom properties, plus the verification tooling above** (I'd fold item 1 in immediately and add item 2 when the theme layer lands). It preserves the plain-CSS thesis your whole stack argument is built on, keeps the dependency surface at zero for styling, avoids betting the styling layer on a plugin's Vite-8 compatibility, and addresses the LLM-verification concern with tools instead of a DSL. The honest case for vanilla-extract is real — theme contracts and typed tokens are genuinely on-thesis — so I'd record it in the decision log as the fallback if, say, per-tenant TMF theming grows complex enough that contract enforcement becomes a must-have rather than a nice-to-have.

---

## Turn 5 — In-editor highlighting

**Carl:**

> I like it, but we'd also lose in-code error/warning highlighting too, right? We'd only get alerted to the problems when building (or running a separate "validate" script), is that correct?

**Claude:**

Mostly no — you'd keep in-editor highlighting for the two biggest failure modes, but it's assembled from two channels rather than coming through TypeScript "for free", and there's one check that stays build-time-only. Breaking it down by failure mode:

**Class-name typos in TSX (`styles.buton`) — live in-editor.** Once the generated `.d.ts` files exist, the TS language server treats `styles` as a typed object like any other import: red squiggle on unknown names, plus autocomplete of available class names. The caveat is staleness — the `.d.ts` must be regenerated when the CSS changes, so you run the generator in watch mode alongside `vite dev` (typed-css-modules has `--watch`). Regeneration is effectively instant; the practical lag is sub-second. Alternatively, `typescript-plugin-css-modules` gives the same editor experience with no generated files and zero staleness, but language-service plugins don't apply to `tsc` on the command line — so the generated-files approach is the one that covers both editor *and* CI with one mechanism.

**Token typos in CSS (`var(--color-primary-drak)`) — live in-editor, via stylelint.** This one doesn't come from TypeScript at all: the stylelint VS Code extension lints as you type, and the `stylelint-value-no-unknown-custom-properties` plugin validates every `var()` against the properties declared in files you point it at (i.e. `tokens.css`). Same config runs in CI. Property-name typos and convention rules (rem-only, logical properties) also surface live through this channel.

**Theme-override completeness (the `--input-border` bug) — build/CI only, honestly.** The custom completeness script has no editor presence. It *could* be written as a custom stylelint rule to get squiggles, but I wouldn't bother initially — it's a check that matters when a theme block is edited, which is rare and localized, and CI catches it before merge.

So the fair comparison: vanilla-extract delivers all of this through one channel (the TS language server) with zero assembly, and that unified DX is its genuine edge. The CSS Modules setup recreates ~90% of it from two channels — TS for class names, stylelint for everything inside `.css` files — at the cost of a watch task and an editor extension, both one-time setup.

One more point given your "LLMs write most of the CSS" framing: the in-editor squiggles mainly serve *you*. Claude Code's feedback loop is running `tsc`/`stylelint`/the build — which works identically under both approaches — and the VS Code extension also surfaces IDE diagnostics to the agent, so both TS and stylelint errors reach it either way. The editor-highlighting question is real but it's a human-DX question, not an agent-verification one.

My recommendation doesn't change: CSS Modules + the tooling, with the understanding that you're trading a little DX assembly for zero styling dependencies and plain CSS.

---

## Turn 6 — The full validation pipeline, human vs LLM

**Carl:**

> So clarify for me the whole process, for both LLM-written and human-written CSS modules/themes? Be clear which source of validation/integrity we get at each step, and how.

**Claude:**

Here's the full pipeline, broken down by integrity source. There are four validation layers, then the honest gap at the end. First the layers themselves, then how each authoring flow moves through them.

### The four integrity sources

**1. TypeScript (class-name integrity).** A watch task (`typed-css-modules --watch`) generates a `.d.ts` next to every `*.module.css`, listing its class names. From then on, `styles` is a typed object: any `styles.foo` reference in TSX is checked against classes that actually exist in the CSS file. Surfaces in the editor via the TS language server (squiggle + autocomplete) and on the command line via `tsc -b`. The generated `.d.ts` files are gitignored and regenerated — which means any CLI/CI typecheck must regenerate them *first*, so the check script is ordered: regenerate types → `tsc -b`.

**2. stylelint (inside-the-CSS integrity).** Validates the CSS files themselves: property-name typos (`property-no-unknown`), malformed values, plus our conventions as rules (rem-only, logical properties). Critically, the `stylelint-value-no-unknown-custom-properties` plugin checks every `var(--x)` against the tokens actually declared in `tokens.css` — so a typo'd or deleted token reference is an error, not a silent empty value. Surfaces in the editor via the stylelint VS Code extension (live, as you type) and on the command line/CI via `stylelint "src/**/*.css"`.

**3. Custom token-completeness script (theme integrity).** A small script that parses `tokens.css` and asserts every `[data-theme]` override block covers the token set it's required to override (and can also cross-check that no token is declared but never used). This is the vanilla-extract "theme contract" replicated in ~50 lines. Command line and CI only — no editor presence. This is the one layer with no live squiggle.

**4. Rendering (visual integrity).** No static tool validates that the CSS *looks right* — spacing, stacking, overflow, dark-mode contrast. That layer is only validated by rendering: the Vite dev server for humans, screenshots/browser-driving for the agent. (Vite's build itself only catches gross CSS syntax errors — a parse failure breaks the build, but a well-formed wrong declaration sails through.)

Everything funnels into one command — say `npm run check` = regenerate CSS types → `tsc -b` → stylelint → token-completeness — and CI runs exactly that plus the build. That single command is the shared backstop for both flows below.

### Human-written flow (you, in VS Code)

1. **While typing CSS**: the stylelint extension lints live — property typos and unknown `var()` tokens get squiggles immediately (source 2).
2. **While typing TSX**: the TS language server flags `styles.buton` and autocompletes class names, as long as the `tcm --watch` task is running so the `.d.ts` tracks your CSS edits with sub-second lag (source 1). The watch task runs alongside `vite dev` (one `npm run dev` via `concurrently`).
3. **While looking at the browser**: the dev server hot-reloads; visual problems are caught by eye (source 4).
4. **Theme edits**: no live feedback — you rely on `npm run check` (source 3) before committing, or CI catches it.
5. **CI on the PR**: re-runs everything from scratch, so nothing depends on your editor having been set up correctly.

The only human-flow caveats: squiggles for class names depend on the watch task running, and theme completeness has no in-editor signal.

### LLM-written flow (Claude Code)

The agent never "sees" squiggles while writing — its integrity comes from feedback *after* each edit, through three channels:

1. **IDE diagnostics**: running inside the VS Code extension, the agent receives TS and stylelint diagnostics for files it just edited — so sources 1 and 2 reach it passively, similar to a human glancing at squiggles after saving.
2. **Explicitly running `npm run check`**: the deterministic verification step after any CSS/component change — all of sources 1–3 in one command. This gets encoded in this repo's CLAUDE.md as the mandatory post-change verification, so every session knows to run it. Optionally, a Claude Code hook can auto-run stylelint on any edited `.css` file and pipe failures straight back into the loop, making source 2 automatic rather than remembered.
3. **Visual verification**: for changes with visual surface, the agent starts the dev server and screenshots the affected state (source 4) — this is the layer static checks can't cover, and it applies doubly to LLM CSS because "compiles clean but looks wrong" is the failure mode types can't catch.

Then CI validates the agent's work identically to a human's.

### Summary: failure mode → where it's caught

| Failure mode                   | Editor (live)                  | CLI / agent loop          | CI                                                 |
| ------------------------------ | ------------------------------ | ------------------------- | -------------------------------------------------- |
| `styles.buton` in TSX          | TS squiggle (needs watch task) | `tsc -b` after type regen | ✅                                                  |
| `var(--token-typo)` in CSS     | stylelint squiggle             | `stylelint`               | ✅                                                  |
| CSS property typo / bad value  | stylelint squiggle             | `stylelint`               | ✅                                                  |
| Theme block missing a token    | — (none)                       | completeness script       | ✅                                                  |
| Compiles clean but looks wrong | human eyes on dev server       | screenshot/verify loop    | — (unless visual regression tests are added later) |

The structural difference from vanilla-extract is that it collapses rows 1, 2, and 4 into the single TS channel with zero setup, while this stack assembles them from TS + stylelint + a script — but the coverage ends up nearly identical, and row 5 (the visual layer) is out of reach for both approaches equally.

If this settles it, say the word and I'll record the decision (mirroring last week's DECISIONS.md format, in this repo), set up the tooling as part of the stylesheet import, and start on the two todos.

---

## Turn 7 — Decision recorded; tokens, tooling & shell built

**Carl:**

> Okay, got it, let's record this decision (and the reasoning)

**Claude:**

*[Created DECISIONS.md with the full styling decision entry (2026-07-06); updated CLAUDE.md to point at it. Then executed both todos:]*

*[Todo 1 — ported `tokens.css` (values byte-identical to the prototype; restructured with `@theme-contract:start/end` markers so themeable tokens — including `--input-border`, `--focus-ring`, `--overlay-scrim` — sit in an enforced contract region) and the root stylesheet `index.css`. Installed `@fontsource-variable/inter` plus dev tooling (`typed-css-modules`, `stylelint`, `stylelint-config-standard`, `stylelint-value-no-unknown-custom-properties`, `concurrently`). Wrote `scripts/check-theme-tokens.mjs` (completeness + no-strays against the contract), `.stylelintrc.json` (standard config; camelCase class selectors for CSS Modules; a few purely stylistic rules disabled to keep the port byte-identical), npm scripts (`dev` with tcm watch, `css:types`, `check`), gitignored `*.module.css.d.ts`.]*

*[Todo 2 — scaffolded the storybook shell in Solid: `App.tsx` (header + hash-linked section nav + panel; six placeholder sections registered in `src/showcase/sections.tsx`), `components/ThemeToggle/` (flips `data-theme`, persists to localStorage), pre-paint theme script in `index.html`, deleted the Vite scaffold demo files, enabled `"strict": true` in tsconfig.]*

*[Verification — `npm run check` green (theme contract: 45 tokens × dark verified; stylelint's unknown-token rule incidentally flagged every `var()` in the old scaffold CSS before deletion, proving the check works); `npm run build` clean; screenshotted the served build in both themes via headless Chrome — light and dark both render the token port faithfully, hash navigation works.]*

Done — decision recorded and both todos complete, all verified.

**Recorded**: DECISIONS.md now holds the full styling decision (CSS Modules over vanilla-extract, the reasoning, the LLM consideration, the coverage table, and vanilla-extract's fallback conditions), and CLAUDE.md points to it plus a new UI_ELEMENTS.md ledger seeded with the shell and theme toggle.

**Todo 1 — tokens + root stylesheet**: tokens.css and index.css are ported with values byte-identical to the prototype, with two deliberate exceptions: the tokens file is restructured around explicit `@theme-contract:start/end` markers (themeable tokens like `--input-border` moved inside; static sizing/type tokens outside), and one hex shortened to satisfy stylelint. The full integrity tooling from the decision is live: `npm run check` runs CSS-module type generation → `tsc -b` → stylelint (which flags unknown `var()` tokens against tokens.css) → the theme-contract script, which validates 45 contract tokens against the dark theme. The contract check proved itself immediately in reverse during setup — and stylelint's unknown-token rule correctly flagged every `var()` in the old Vite scaffold CSS before I deleted it.

**Todo 2 — storybook shell**: App.tsx is a hand-rolled Solid shell — header, section nav, and panel — with six placeholder sections (Buttons, Inputs, Selectors, Layout, Feedback, Table) registered in sections.tsx. The active section lives in the URL hash (`#/selectors`) via plain anchors and one `hashchange` listener, so no routing library while that decision is open. The ThemeToggle flips `data-theme` on `<html>` with localStorage persistence and a pre-paint script in index.html to prevent flash — the prototype's pattern, redone in Solid.

**Verification**: `npm run check` and `npm run build` are both green, and I screenshotted the served build in both themes — light renders the token port faithfully (selected-pill nav, Inter, orange focus ring available), dark shows the inverted surface scale working (drawer recedes, selected item lifts). First bundle datapoint: **9.2 KB gzip JS / 2.4 KB gzip CSS** for the whole shell including the Solid runtime.

Two judgment calls to flag: I enabled `"strict": true` in tsconfig (the scaffold oddly lacked it, and non-strict TS undercuts the verification thesis — revert if it was deliberate), and I tuned stylelint to camelCase class selectors (CSS Modules convention) while disabling a few purely stylistic rules that fought the byte-identical port. Ready to start on the first real components — Buttons seems the natural opener.