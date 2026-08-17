# Styling checks cheat sheet

How the style typing and verification scripts work: what runs, when, why, and what you need to do. Companion to [PAGES.md](./PAGES.md).

## The one command

```
npm run check
```

Run it after **any** CSS or component change. It chains six steps with `&&`, so it stops at the first failure:

| #   | Step                               | What it does                                                                                                    | What it catches                                                                          |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | `npm run css:types`                | [tcm](https://github.com/Quramy/typed-css-modules) regenerates a `.d.ts` next to every `*.module.css` in `src/` | (Feeds step 2 — stale/missing types)                                                     |
| 2   | `tsc -b`                           | Typecheck, using those `.d.ts` files                                                                            | `styles.buton` → compile error; missing/renamed classes                                  |
| 3   | `stylelint "src/**/*.css"`         | Standard lint + the unknown-custom-properties plugin, checked against `tokens.css`                              | `var(--typo)` — a CSS variable that doesn't exist; non-camelCase class names             |
| 4   | `scripts/check-theme-tokens.mjs`   | Theme-contract check on `src/ui/styles/tokens.css`                                                              | A theme block missing a token override, or overriding a token that isn't in the contract |
| 5   | `scripts/check-page-css.mjs`       | No CSS files under `src/pages/` (allowlist: `Login`)                                                            | A page trying to own styling (principle #10)                                             |
| 6   | `scripts/check-reduced-motion.mjs` | Every duration comes from a `--motion-*` token, and the reduce block zeroes them                                | Motion that `prefers-reduced-motion` can't reach (principle #9)                          |

Nothing runs on commit or in CI yet — running `check` is on you. `npm run build` runs steps 1–2 only (types + typecheck) before `vite build`; it does **not** lint or run the three scripts.

## CSS-module typing (steps 1–2)

**The problem**: a CSS Modules import is "_stringly_-typed" — `styles.anything` compiles fine and silently renders unstyled if the class doesn't exist.

**The fix**: `typed-css-modules` (tcm) reads each `Button.module.css` and writes a sibling `Button.module.css.d.ts` declaring exactly the classes that exist:

```ts
declare const styles: {
  readonly button: string;
  readonly icon: string;
};
export = styles;
```

Now `styles.buton` is a TypeScript error, in the editor and in `check`. Note tcm and Vite never talk to each other: Vite transforms the CSS at build time (hashes the class names), tcm just mirrors the file into the type system.

**When it runs:**

- `npm run dev` runs `tcm --watch` alongside Vite (via `concurrently`), so while the dev server is up, `.d.ts` files regenerate on save and typos squiggle immediately.
- Not running the dev server? A new/renamed class won't exist in the types until you run `npm run css:types` (or `check`, which includes it).

**Scaling**: the watch mode stays fast as the app grows — per save it regenerates only the changed file's `.d.ts` (a chokidar `change` handler, not a full scan), and it skips the disk write entirely when the class list is unchanged, so a values-only CSS edit doesn't even poke tsserver. The only full passes are at watcher startup and in `check`/`build`. And since pages own no CSS (principle #10), hundreds of pages add **zero** CSS modules — the module count tracks the component library, which plateaus.

**Rules:**

- `*.module.css.d.ts` files are **gitignored and generated** — never edit or commit them.
- Class names must be **camelCase** (`selector-class-pattern` in `.stylelintrc.json` enforces it) so they're valid identifiers for `styles.myClass` dot-access.
- "Cannot find module `./X.module.css`" from tsc means the `.d.ts` hasn't been generated yet — run `npm run css:types`.

## Token discipline (steps 3–4)

**The problem**: `var(--tpyo)` is not a CSS error — it resolves to nothing at runtime and the property is silently dropped. And a token themed in light but forgotten in dark renders wrong only in dark mode (the RnD prototype shipped exactly this bug with `--input-border`).

**The fix, part 1 — stylelint** (`stylelint-value-no-unknown-custom-properties`): every `var(--x)` in any CSS file must be declared in `src/ui/styles/tokens.css`. Two externally-owned properties are declared as exceptions in `.stylelintrc.json`: `--kb-popper-content-available-height` (set by Kobalte at runtime) and `--ripple-color` (set from JS by `createRipple`). If a component sets a custom property from JS or a library injects one, add it there — don't fake a declaration in tokens.css.

**The fix, part 2 — the theme contract** (`scripts/check-theme-tokens.mjs`): `tokens.css` has a region inside `:root` fenced by `/* @theme-contract:start */` … `/* @theme-contract:end */` comment markers. The script enforces, for every `[data-theme='…']` block in the file:

1. **Completeness** — every contract token is overridden (no forgotten dark values);
2. **No strays** — the block overrides _only_ contract tokens (catches typos, and attempts to theme a static token);
3. **Custom-theme coverage** — every contract token is either reachable from a custom-theme role/recipe or listed in `NOT_THEMABLE`, both in [`src/ui/branding/themeRecipes.ts`](../branding/themeRecipes.ts). This is what stops a new colour token silently becoming unthemable for sites. See [`kdd/custom-themes`](../../../kdd/custom-themes/draft-kdd.md) and [CUSTOM_THEMES.md](./CUSTOM_THEMES.md).

**Adding a token** — decide which kind it is:

- **Themed** (colours, shadows — anything that differs between light and dark): declare it _inside_ the contract markers, then add an override to **every** `[data-theme]` block. The script fails until you do both. Then decide whether a **site's custom theme** should be able to change it: give it a recipe/role in `themeRecipes.ts`, or add it to `NOT_THEMABLE` with the reason. The script fails until you do one of those too.
- **Static** (spacing, radii, typography, sizes): declare it _below_ the contract markers, and don't touch the theme blocks. Static tokens are out of a custom theme's reach by construction — that is why a custom theme cannot break the layout.

## Page-CSS check (step 5)

Pages compose, never style: any `.css` file under `src/pages/` fails the check, except top-level page dirs allowlisted in `scripts/check-page-css.mjs` (currently only `Login`, for its bespoke gradient hero). A page that "needs" CSS means a library component or token is missing — raise that instead. Allowlisting a new page requires a [`kdd/page-composition`](../../../kdd/page-composition/draft-kdd.md) entry. See [PAGES.md](./PAGES.md).

## Motion check (step 6)

**The problem**: `prefers-reduced-motion` used to be a per-component courtesy — around twenty CSS modules each ended in their own `@media (prefers-reduced-motion: reduce) { … transition: none }` block, and five (MenuBar, Select, Combobox, MultiSelect, StoreSelector) had simply never grown one. Nothing said they had to, so the a11y baseline depended on each new component remembering.

**The fix — motion is a token**. Every transition/animation duration _and delay_ in the app reads a `--motion-*` token, and `tokens.css` zeroes the decorative ones in a single reduce block. Honouring the preference is then a property of the token layer: a new component that styles with tokens gets it for free, and `scripts/check-reduced-motion.mjs` fails the build on any literal duration that would escape it. Timing **functions** stay per-component — `ease` vs `ease-out` carries no accessibility meaning.

Four decorative tiers, chosen by what moves:

| Token             | Value   | For                                                                           |
| ----------------- | ------- | ----------------------------------------------------------------------------- |
| `--motion-fast`   | `120ms` | In-place state feedback: colour, border, shadow, opacity                      |
| `--motion-base`   | `150ms` | Small movement or an entry: chevron rotate, dialog/popover in, table row fade |
| `--motion-slow`   | `200ms` | Real travel: nav drawer, side panel, tab indicator, scrim                     |
| `--motion-ripple` | `480ms` | The one-shot click ripple (`ui/utils/createRipple`)                           |

Plus two that are **not** decorative and so are excluded from the reduce block: `--motion-spin` (700ms) and `--motion-pulse` (2s). A looping indicator is the only sign that work is still in flight, and zeroing an infinite duration doesn't stop it anyway — it pins the element to one keyframe. Each owner decides instead: the Spinner and the button spinners drop to a 2s crawl (a frozen ring reads as a hung app), ProgressList's pulse stops outright in its own reduce block (the active step is also carried by tone and hidden status text).

**A component may still write its own reduce block** — the script exempts anything inside one — but only for something zeroing can't express:

- stopping a **looping** animation (`ProgressList`);
- suppressing a **displacement** rather than making it instant (`WidgetCard` drops the hover lift entirely — shadow and border still change, so hover is never signalled by motion alone);
- staying on a proven code path (`Accordion` removes its height animation, because Kobalte gates the closing content's unmount on `animation-name: none`).

**Adding motion** — reach for an existing tier first; the point of four is that a fifth "160ms" is noise. A genuinely new kind of motion gets a token inside the `/* @motion-decorative:start */ … end */` markers **and** an entry in the reduce block (the script fails until both exist). Never a literal, and never `scroll-behavior: smooth` — it has no duration to tokenise, so scroll from JS via `smoothScrollOptions()` in [`ui/utils/createMediaQuery`](../utils/createMediaQuery.ts), which drops back to an instant jump. That module's `prefersReducedMotion()` is the one-shot read for the rare case where JS decides the motion (`createRipple` spawns no ripple at all).

## What the checks do NOT catch

- **Colour literals.** Stylelint does not flag `#fff`, `rgb(…)`, `hsl(…)` in component CSS, but they're banned outside `tokens.css` (every colour derives from a token — `var(--token)` or a `color-mix()` tint of one). **Grep new CSS for `#`, `rgb(`, `hsl(` before calling it done**, especially when porting from the RnD prototype, which hard-codes whites and `rgba()` tints.
- **px sizing.** The rem/em rule (px only for hairline borders, radii, shadow offsets) is convention, not lint.
- **Looks wrong.** All of this is static analysis — anything with visual surface also needs a render check (dev server / screenshot).
- **Accessibility.** Keyboard pass, screen-reader smoke test, and contrast checks are manual for now. Step 6 covers reduced motion in CSS only — motion driven from JS (a WAAPI animation, a smooth scroll) is on you to route through [`ui/utils/createMediaQuery`](../utils/createMediaQuery.ts).

## Day-to-day flow

1. Have `npm run dev` running — class-name types stay fresh as you edit CSS.
2. Style with tokens: `var(--…)` for every colour, rem/em for every size, `var(--motion-…)` for every duration, logical properties for direction.
3. Need a colour with no token? Add one to `tokens.css` (themed → inside the contract + a dark override), never a literal in component CSS. Same for a duration — a `--motion-*` token plus its reduce-block entry, never a literal.
4. Done? `npm run check`, grep your new CSS for colour literals, and eyeball it rendered in both themes.
