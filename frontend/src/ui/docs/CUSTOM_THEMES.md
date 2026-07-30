# Custom themes — format design (proposal)

**Status:** design proposal for review (Carl, 2026-07-30). Nothing implemented yet. Once the format is signed off, this doc becomes the format reference + implementation guide, a `kdd/custom-themes` entry records the decision, and the existing Settings › Display › **Custom theme** editor is wired to it.

## What this is for

A store's server can hold a **custom theme** — a free-text string saved per site (`displaySettings.customTheme`, edited in Settings › Display by a Server Admin, spec/settings/rules.md § Display settings). The reference app treats that string as a partial [MUI theme object](https://mui.com/material-ui/customization/theming/) and deep-merges it into its own theme. This app has no MUI theme: it has `src/ui/styles/tokens.css`, a flat set of CSS custom properties with a checked **theme contract** (every contract token overridden in `[data-theme='dark']`, nothing else overridable — `scripts/check-theme-tokens.mjs`).

So we need our own theme document format, and it should not be "a JSON file full of `--bg-group-dark`". A site administrator wanting their ministry's blue instead of TMF orange should be able to write one line.

### Scope

- **Colours only.** Spacing, sizing, typography, radii, layout dimensions and the four input heights are _not_ themable, by construction: they live below the `@theme-contract` markers in `tokens.css` and no theme role reaches them. A custom theme cannot break the layout, the density system, or the touch-target floor.
- Within colours, the composite values that are _made of_ colours — the two hero gradients, the shadow ladder, the focus rings, the scrim — are themable, but as **recipes** (fixed geometry, themed colour), never as raw CSS the author has to write.
- Two tokens that look colour-ish are deliberately **not** themable and stay outside the contract: `--qr-foreground` / `--qr-background` (a QR code must stay dark-on-light in both themes or scanners stop reading it).

## Design goals

1. **A one-line theme must work.** `{ "brand": "#0b6e99" }` is a valid, useful theme.
2. **Partial by default.** Anything not mentioned keeps its stock value _exactly_ — no re-derivation, no drift.
3. **Plain-English keys.** Roles named for what they mean (`brand`, `surface`, `text`, `danger`), never token names. Token names appear only in the one deliberate escape hatch.
4. **Light + dark in one document,** with the single-theme case being the short one.
5. **Nothing an author writes can break the app.** Worst case is ugly; recovery is one toggle.
6. **Honest validation.** Say what's wrong (and what's low-contrast) instead of silently ignoring it — the reference app's shallow `JSON.parse` check is the whole reason spec/settings/rules.md carries a ⚠️ VERIFY about valid-JSON-but-wrong-shape themes.

## The format

JSON (the field is a string, the existing editor and spec already validate JSON, and `JSON.parse` costs no bundle). A document is:

```json
{
  "name": "Ministry of Health",
  "light": { "…roles…": "…" },
  "dark": { "…roles…": "…" }
}
```

- `name` — optional label, shown in Settings above the editor. Cosmetic.
- `light` / `dark` — a **theme block** each, both optional. A document with only `dark` themes dark mode and leaves light stock.
- **Shorthand:** if there is no `light`/`dark` key, the roles sit at the top level and that _is_ the light theme (see [Single-block themes and dark mode](#single-block-themes-and-dark-mode)).

Mixing the two forms (top-level roles _and_ a `light`/`dark` key) is an error rather than a merge, so there is never a question of which wins.

### Theme blocks: eleven roles

Every role is optional. Each colour role takes **either a colour string or an object** — the string form is shorthand for `{ "base": … }` (or `{ "page": … }` for `surface`, `{ "body": … }` for `text`) and everything else in the group is derived from it. Any member given explicitly is used verbatim instead of derived.

| Role      | String form sets | Object members (all optional)                                                                          | Drives                                                                                                  |
| --------- | ---------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `brand`   | `base`           | `base`, `light`, `dark`, `on`, `gradient`                                                              | primary palette, the Login hero gradient, brand-tinted chrome                                           |
| `accent`  | `base`           | `base`, `light`, `dark`, `gradient`                                                                    | the action blue: dialog primary buttons, info, focus ring, icon tints, the Initialisation hero gradient |
| `danger`  | `base`           | `base`, `background`                                                                                   | errors, invalid-field ring, cancelled status                                                            |
| `warning` | `base`           | `base`                                                                                                 | warning alerts, amber statuses                                                                          |
| `success` | `base`           | `base`                                                                                                 | success alerts, verified/finalised statuses                                                             |
| `surface` | `page`           | `page`, `chrome`, `nav`, `navSelected`, `header`, `raised`, `sunken`, `input`, `disabled`, `login`     | every background: content, drawer, menus, toolbars, rows, group bands, cards, inputs                    |
| `text`    | `body`           | `body`, `muted`, `label`, `button`, `disabled`, `onGradient`                                           | all ink, plus the derived grey scale                                                                    |
| `border`  | `base`           | `base`, `divider`, `input`, `strong`                                                                   | hairlines, field edges, header edge, control outlines                                                   |
| `status`  | — (object only)  | `new`, `allocated`, `picked`, `shipped`, `delivered`, `received`, `verified`, `cancelled`, `finalised` | status chips + dots                                                                                     |
| `shadow`  | `color`          | `color`, `scrim`                                                                                       | the elevation ladder, the frozen-column shadow, the modal/nav scrim                                     |
| `tokens`  | — (object only)  | any themable token name → CSS value                                                                    | the escape hatch (below)                                                                                |

Colours are **hex (`#rgb`, `#rrggbb`, `#rrggbbaa`), `rgb()`/`rgba()` or `hsl()`/`hsla()`**. That keeps the validator a small pure function (it needs real channel values to compute contrast) and covers what people actually paste. Other CSS colour syntaxes (`oklch()`, named colours, `color-mix()`) are accepted only in `tokens`, where nothing is derived from them.

`gradient` takes either a two-colour array — `["#ff8800", "#e63535"]`, rendered at the stock 156° — or a raw CSS gradient string for full control.

### Examples

Minimal — one line, brand recoloured everywhere including the Login hero:

```json
{ "brand": "#0b6e99" }
```

Typical — a light theme with tuned chrome, plus a hand-picked dark counterpart:

```json
{
  "name": "Ministry of Health",
  "light": {
    "brand": { "base": "#0b6e99", "on": "#ffffff" },
    "accent": "#1f8fbf",
    "surface": { "page": "#ffffff", "nav": "#eef4f7" },
    "text": "#12212b"
  },
  "dark": {
    "brand": "#4db3d6",
    "accent": "#6fc3e0",
    "surface": { "page": "#101a20", "nav": "#0b1216" }
  }
}
```

Escape hatch — one token, exactly:

```json
{ "tokens": { "--status-shipped": "#1fb6b6" } }
```

`tokens` accepts only names inside the theme contract that the role map classifies as themable; anything else (a spacing token, `--qr-foreground`, a typo) is a validation error naming the offending key. It exists so a one-off need never forces a format change, and it is documented as the last resort.

## Rules

### Partial means partial, at role granularity

Specifying `brand` rewrites the brand-derived tokens and **nothing else**. The stock surface scale, ink, borders and statuses stay byte-identical, because the compiler emits declarations only for groups the author mentioned. This is why a partial theme can never shift a colour the author didn't ask about — the alternative (always re-deriving the whole palette from whatever roles are known) would round-trip today's hand-tuned values through the derivation table and move them a shade.

Within a mentioned group, explicit members win and the rest derive from the group's base.

### Single-block themes and dark mode

A single-block theme (top-level roles, or only `light`) is a **light** theme. In dark mode:

- the **hue** roles carry over — `brand`, `accent`, `danger`, `warning`, `success`, `status` — with their light/dark variants derived using the dark-mode recipes, so a ministry's blue is still the ministry's blue in dark mode;
- the **neutral** roles do **not** — `surface`, `text`, `border`, `shadow` keep the stock dark values. A `page: "#ffffff"` written for light mode must not be applied to dark mode, and dark mode's surface/ink pairs are hand-tuned for contrast (see the `--color-divider` note in `tokens.css`).

To control dark surfaces, add a `dark` block. This rule is stated in the Settings UI help text, not just here.

### Deliberately not derived

`shipped`, `delivered`, `received` have their own hues with no palette relationship, so they are settable but never derived. The other six statuses default to aliases of the roles above (`new` → the mid grey, `allocated` → `accent`, `picked` → `warning`, `cancelled` → `danger`, `verified`/`finalised` → `success`), exactly as `tokens.css` does today.

## How derivation works

Each themable token has one **recipe row** per mode:

```
token          light                                   dark
--bg-drawer    mix(page, ink, 6%)                      mix(page, black, 24%)
--text-secondary  mix(page, body, 25%)                 mix(page, body, 24%)
--primary-light   mix(base, white, 20%) [oklab]        mix(base, white, 30%) [oklab]
--focus-ring   0 0 0 0.1875rem mix(accent, transparent, 25%)   …45%
```

Two properties make this safe rather than clever:

1. **The amounts are fitted to the stock palette, not invented.** Feeding the stock inputs back in reproduces today's values — e.g. `surface.page: "#fff"` + `text.body: "#1c1c28"` regenerates `--bg-toolbar` `#fafafc` (98%), `--bg-drawer` `#f2f2f5` (94%), `--bg-group-dark` `#e2e2e9` (87%), `--color-border-value` `#e4e4eb` (88%), `--input-border` `#c0c0c4` (72%), `--gray-main` `#8f90a6` (51%), `--text-disabled` `#7a7b90` (41%). The composite recipes fit exactly: the stock light `--focus-ring` _is_ `--secondary-main` at 25%, and `--focus-ring-error` _is_ `--error-main` at 20%. A unit test asserts this round-trip within 2/255 per channel for every neutral token, in both modes — so the derivation table can't drift from the design system it was fitted to.
2. **Recipes compile to CSS, not to computed hex.** The emitted declaration is `--bg-drawer: color-mix(in srgb, var(--bg-white) 94%, var(--text-body));`. It reads correctly in devtools, it resolves against whatever the author set (or the stock value, if they set neither), and it needs no colour maths at runtime. Perceptual mixes (the hue ladders) use `in oklab`; neutral mixes use `in srgb`, which is what the fitted percentages were measured in. `color-mix` is unconditionally fine — the enforced Chromium floor is 138 (`scripts/check-min-browser.mjs`).

JavaScript colour maths is needed in exactly two places, both about contrast rather than tinting: choosing `brand.on` / `text.onGradient` (white vs. dark ink) when the author doesn't supply it, and computing the contrast **warnings**. Hence the hex/rgb/hsl-only rule for role colours.

### Role → token coverage

Complete, so that adding a colour token to the contract forces a themability decision (enforced — see [Tooling](#tooling-and-enforcement)).

| Role         | Tokens                                                                                                                                                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brand`      | `--primary-main` `--primary-light` `--primary-dark` `--primary-contrast` `--gradient-primary`                                                                                                                                                                        |
| `accent`     | `--secondary-main` `--secondary-light` `--secondary-dark` `--info-main` `--focus-ring` `--bg-icon` `--gray-pale` `--gradient-secondary` `--status-allocated`                                                                                                         |
| `danger`     | `--error-main` `--error-bg` `--focus-ring-error` `--status-cancelled`                                                                                                                                                                                                |
| `warning`    | `--warning-main` `--color-warning` `--status-picked`                                                                                                                                                                                                                 |
| `success`    | `--success-main` `--status-verified` `--status-finalised`                                                                                                                                                                                                            |
| `surface`    | `--bg-white` `--surface-raised` `--table-card-surface` `--bg-drawer` `--bg-menu` `--bg-toolbar` `--bg-row` `--bg-group-light` `--bg-group-main` `--bg-group-dark` `--bg-input` `--bg-disabled` `--header-bg` `--drawer-selected-bg` `--drawer-hover-bg` `--bg-login` |
| `text`       | `--text-body` `--text-secondary` `--text-label` `--button-text` `--text-disabled` `--gray-main` `--gray-light` `--gray-dark` `--login-hero-text`                                                                                                                     |
| `border`     | `--color-border-value` `--color-divider` `--input-border` `--header-border` `--outline-main`                                                                                                                                                                         |
| `status`     | the nine `--status-*`                                                                                                                                                                                                                                                |
| `shadow`     | `--shadow-1`…`--shadow-4` `--shadow-drawer` `--shadow-frozen-col` `--overlay-scrim`                                                                                                                                                                                  |
| not themable | `--qr-foreground` `--qr-background` (scanner reliability), `--disabled-opacity` (not a colour), everything below the `@theme-contract` markers                                                                                                                       |

Note `--warning-main` (alert orange) and `--color-warning` (the CCE amber) are distinct tokens today but both come from `warning.base`; a site that genuinely wants them different uses `tokens`.

## Applying a theme

```ts
// src/ui/styles/customTheme.ts — pure, colocated tests
compileTheme(text: string): {
  css: string;
  errors: ThemeProblem[];    // block the save
  warnings: ThemeProblem[];  // shown, don't block
};
```

Emitted CSS is one block per mode:

```css
:root:root {
  --primary-main: #0b6e99;
  --primary-light: color-mix(in oklab, var(--primary-main) 80%, #fff);
  /* … */
}
:root:root[data-theme='dark'] {
  /* … */
}
```

The doubled `:root:root` is deliberate: it outranks both `:root` and `:root[data-theme='dark']` in `tokens.css` regardless of stylesheet order (dev-server style injection and HMR both append), while keeping the custom dark block ahead of the custom light block. The result is injected as a single `<style id="oms-custom-theme">` appended to `<head>`.

Lifecycle:

- **Pre-paint.** The compiled CSS is cached in `localStorage` (`oms-custom-theme-css`, alongside the existing `oms-theme` key) and injected by the inline script in `index.html` / `showcase.html`, so a themed site never flashes TMF orange on load. The pre-paint script stays a few lines of ES5 — it injects a string, it does not compile.
- **After login.** `displaySettings` is fetched with the stored hash (the same value+hash protocol the reference app uses at Login); on change, recompile, refresh the cache, and swap the style element's text — no reload.
- **On save** in Settings: compile first, refuse the save on errors, then persist, cache, and reload the app (the behaviour spec/settings/rules.md already requires).
- **On clear** (toggle off): drop the cache and remove the style element in place — immediate, no reload.

**Failure is inert.** An invalid declaration is dropped by the CSS parser, so a bad theme cannot white-screen the app or block the Settings page that removes it. That is the answer to the ⚠️ VERIFY in spec/settings/rules.md: valid-JSON-but-wrong-shape is now refused at save time, and anything that slips through degrades cosmetically with a working recovery path.

## Validation and error reporting

**Errors** (save refused, all reported at once rather than first-only): malformed JSON, with line/column; unknown role or member key, with a "did you mean" for near misses; wrong type for a role or member; unparseable colour, naming the value; top-level roles mixed with `light`/`dark`; a `tokens` key that isn't a themable token.

**Warnings** (saved, listed under the editor): text-on-surface pairs below WCAG AA 4.5:1 (`text.body` and `text.muted` against `surface.page`, `surface.nav`, `surface.input`), `brand.on` against `brand.base`, status/severity hues below 3:1 against their surface, and a `brand`/`accent` base too close to `surface.page` to be visible. Accessibility is the baseline here (`src/ui/CLAUDE.md` #9), and a theme is the one place a site can break AA everywhere at once — but a warning, not a veto: the author may have a reason, and we shouldn't be the last word on their brand.

Warnings are computed per mode, and are the reason validation lives in a pure module rather than in the Settings component: they're worth unit-testing directly.

## Settings UI

The existing `EditorToggleRow` in [DisplaySettingsSection.tsx](../../sections/settings/display/DisplaySettingsSection.tsx) stays as-is — toggle on reveals the editor, save is explicit, toggle off clears immediately. Three changes:

1. `parseThemeJson` in [displayLogic.ts](../../sections/settings/display/displayLogic.ts) becomes `compileTheme`, so the save gate is shape-aware; the single `Alert` becomes a list of errors and, separately, warnings.
2. The empty seed becomes a commented-out-free minimal document (`{ "brand": "#0b6e99" }` shaped) rather than `{}`, plus an `InfoTooltip` linking the role list — the logo row already has this shape.
3. **Preview** button beside Save: injects the compiled CSS without persisting, so an author sees the theme before committing a reload. Reverts on navigate-away or on Cancel.

New locale keys go in `src/intl/locales/en/` only. The validation list gets a testid (`custom-theme-problems`) per `e2e/TESTIDS.md`.

A dev-only showcase page (`#/showcase/theming`) is the natural authoring surface: the role table, a paste-a-document box, live preview, and the contrast report. Worth doing, but it is not on the critical path.

## Tooling and enforcement

- `scripts/check-theme-tokens.mjs` gains a third check: every token named by the role map exists in the contract, and every contract token is either covered by a role or in the explicit not-themable list. Adding a colour token then can't silently be unthemable.
- Colocated unit tests: the stock round-trip fidelity test (above), partial-emission (only mentioned groups appear in the output), single-block dark carry-over, and one case per validation error.
- No new dependency, at all. The colour parser and contrast maths are ~60 lines; everything else is `color-mix` in the emitted CSS.

## Rejected alternatives

- **A flat list of token names** (`{"--bg-group-dark": "#e2e2e9"}`) — the thing this design exists to avoid. Also freezes our internal token names into a public, server-persisted document, so renaming a token becomes a breaking change for every site.
- **Accept the reference app's MUI theme objects** (`{"palette": {"primary": {"main": …}}}`) — a format defined by a library this app doesn't use, with a large surface (`components`, `mixins`, `typography`) we'd have to either honour or silently drop. See [Legacy themes](#legacy-themes) for the migration path instead.
- **Derive everything from one seed colour.** Tempting for the one-line case, but it can only produce a generated palette; it can't express "our blue, but keep the stock greys", which is what sites actually ask for. The role model gets the one-liner anyway.
- **Always re-derive the full palette from known roles** — drops the partial-means-partial guarantee and quietly moves hand-tuned values.
- **Merge semantics for top-level + `light`/`dark`** (top-level as shared base) — strictly more expressive, but it makes "is this the light theme or the shared base?" ambiguous at a glance, and the hue carry-over rule already covers the case people want.
- **Auto-lift a too-dark brand colour in dark mode** to clear 3:1 against the dark surface. Real accessibility need, but silently altering the site's brand colour is worse than telling the author. Warn instead; revisit if warnings get ignored in practice.
- **YAML/TOML for friendlier authoring** — needs a parser dependency for a document edited a handful of times per site.
- **Themable typography/spacing** — the fastest route to a broken layout, and no site has asked. The contract markers already draw this line.

## Legacy themes

A store upgrading from the reference app may already have a MUI-shaped theme saved server-side, which this format will reject. The compiler detects the shape (top-level `palette` / `typography` / `mixins` / `components`) and reports it specifically — "this is a theme from the previous app version" — rather than as a pile of unknown-key errors. A **Convert** action next to the error is cheap and worth it: `palette.primary.main` → `brand`, `palette.secondary.main` → `accent`, `palette.error.main` → `danger`, `palette.background.*` → `surface`, listing what it dropped. The author reviews and saves.

## Implementation plan

1. `src/ui/styles/customTheme.ts` — types, colour parser, recipe table, `compileTheme`, contrast checks; colocated tests incl. the stock round-trip.
2. `src/ui/styles/applyCustomTheme.ts` — style-element injection + `localStorage` cache; pre-paint snippet in `index.html` / `showcase.html`.
3. Boot wiring — fetch `displaySettings` with the stored hash after login, compile, cache, apply.
4. Settings — `compileTheme` gate, problem list, seed, tooltip, Preview.
5. `scripts/check-theme-tokens.mjs` coverage check.
6. Docs — this doc becomes the format reference; `kdd/custom-themes` records the decision; pointers added to `src/ui/CLAUDE.md` and `src/ui/docs/STYLING.md`.
7. Spec — spec/settings/rules.md § Display settings (validation is now shape-aware, Preview exists, ⚠️ VERIFY resolved) and a DIVERGENCES entry alongside D52, via spec/PROCESS.md.
8. Optional — `#/showcase/theming` authoring page; legacy MUI **Convert**.

Steps 1–5 are the shippable unit; 6–7 land with them.

## Open decisions

1. **Unknown role/member keys: error or warning?** Proposed **error** (with a suggestion), because a silent typo means an invisible no-op. The cost is that a document written for a newer app version fails wholesale on an older one — rare, since a theme is saved per site against a known app version.
2. **`shadow` role at all?** It's the least-asked-for role and shadows are the fiddliest to get right. Could ship as `tokens`-only and add the role later.
3. **Preview in phase 1?** It's the single biggest authoring-quality win and is ~20 lines given the compiler, but it is a spec addition (the reference app has no preview) rather than a reconciliation.
4. **Legacy MUI Convert in phase 1, or just the specific error message?**
