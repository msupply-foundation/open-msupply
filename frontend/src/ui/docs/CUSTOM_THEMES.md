# Custom themes — format reference

**Status:** implemented (2026-07-30). This is the format reference and the implementation guide; the decision and its rejected alternatives live in [`kdd/custom-themes`](../../../kdd/custom-themes/draft-kdd.md), and the user-facing half is [CUSTOM_THEME_EXAMPLE.md](./CUSTOM_THEME_EXAMPLE.md). The code is `src/ui/branding/` — `customTheme.ts` (the pure compiler), `themeRecipes.ts` (the fitted table), `applyBranding.ts` (the DOM side) and `AppLogo.tsx` — wired into Settings › Display and the startup pass.

## What this is for

A store's server can hold a **custom theme** — a free-text string saved per site (`displaySettings.customTheme`, edited in Settings › Display by a Server Admin, spec/settings/rules.md § Display settings). The reference app treats that string as a partial [MUI theme object](https://mui.com/material-ui/customization/theming/) and deep-merges it into its own theme. This app has no MUI theme: it has `src/ui/styles/tokens.css`, a flat set of CSS custom properties with a checked **theme contract** (every contract token overridden in `[data-theme='dark']`, nothing else overridable — `scripts/check-theme-tokens.mjs`).

So we need our own theme document format, and it should not be "a JSON file full of `--bg-group-dark`". A site administrator wanting their ministry's blue instead of TMF orange should be able to write one line.

### Scope

- **Colours only.** Spacing, sizing, typography, radii, layout dimensions and the four input heights are _not_ themable, by construction: they live below the `@theme-contract` markers in `tokens.css` and no theme role reaches them. A custom theme cannot break the layout, the density system, or the touch-target floor.
- Within colours, the composite values that are _made of_ colours — the two hero gradients, the focus rings — follow their role as **recipes** (fixed geometry, themed colour), never as raw CSS the author has to write. The shadow ladder and the scrim are reachable only through the `tokens` escape hatch (no `shadow` role — see below).
- Two tokens that look colour-ish are deliberately **not** themable and stay outside the contract: `--qr-foreground` / `--qr-background` (a QR code must stay dark-on-light in both themes or scanners stop reading it).

## Design goals

1. **A one-line theme must work.** `{ "brand": "#0b6e99" }` is a valid, useful theme.
2. **Partial by default.** Anything not mentioned keeps its stock value _exactly_ — no re-derivation, no drift.
3. **Plain-English keys.** Roles named for what they mean (`brand`, `surface`, `text`, `danger`), never token names. Token names appear only in the one deliberate escape hatch.
4. **Light + dark in one document,** with the single-theme case being the short one.
5. **Nothing an author writes can break the app.** Worst case is ugly; recovery is one toggle.
6. **Honest validation.** Say what's wrong (and what's low-contrast) instead of silently ignoring it — the reference app's shallow `JSON.parse` check is the whole reason spec/settings/rules.md carries a ⚠️ VERIFY about valid-JSON-but-wrong-shape themes. But keep the format's own forgiveness: a document is applied as far as it is understood (see [Validation](#validation-and-error-reporting)).

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

### Theme blocks: ten roles

Every role is optional. Each colour role takes **either a colour string or an object** — the string form is shorthand for `{ "base": … }` (or `{ "page": … }` for `surface`, `{ "body": … }` for `text`) and everything else in the group is derived from it. Any member given explicitly is used verbatim instead of derived.

| Role      | String form sets | Object members (all optional)                                                                          | Drives                                                                                                                                                 |
| --------- | ---------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `brand`   | `base`           | `base`, `light`, `dark`, `on`, `gradient`                                                              | primary palette, the Login hero gradient, brand-tinted chrome                                                                                          |
| `accent`  | `base`           | `base`, `light`, `dark`, `gradient`                                                                    | the action blue: dialog primary buttons, info, focus ring, icon tints, the Initialisation hero gradient                                                |
| `danger`  | `base`           | `base`, `background`                                                                                   | errors, invalid-field ring, cancelled status                                                                                                           |
| `warning` | `base`           | `base`, `alert`                                                                                        | `base`: inline caution — field warning text, warning row tints, amber statuses. `alert`: the warning severity panel (Alert, Badge); defaults to `base` |
| `success` | `base`           | `base`                                                                                                 | success alerts, verified/finalised statuses                                                                                                            |
| `surface` | `page`           | `page`, `chrome`, `nav`, `navSelected`, `header`, `raised`, `sunken`, `input`, `disabled`, `login`     | every background: content, drawer, menus, toolbars, rows, group bands, cards, inputs                                                                   |
| `text`    | `body`           | `body`, `muted`, `label`, `button`, `disabled`, `onGradient`                                           | all ink, plus the derived grey scale                                                                                                                   |
| `border`  | `base`           | `base`, `divider`, `input`, `strong`                                                                   | hairlines, field edges, header edge, control outlines                                                                                                  |
| `status`  | — (object only)  | `new`, `allocated`, `picked`, `shipped`, `delivered`, `received`, `verified`, `cancelled`, `finalised` | status chips + dots                                                                                                                                    |
| `tokens`  | — (object only)  | any themable token name → CSS value                                                                    | the escape hatch (below)                                                                                                                               |

There is deliberately **no `shadow` role** (Carl, 2026-07-30): the elevation ladder, the frozen-column shadow and the scrim are the least-asked-for and the fiddliest to get right, and a site that needs them can reach them through `tokens`. Shadows therefore stay stock in every custom theme unless named token-by-token.

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

**The worked example: [system-theme.example.json](./custom_themes/system-theme.example.json)**, annotated for site administrators in **[CUSTOM_THEME_EXAMPLE.md](./CUSTOM_THEME_EXAMPLE.md)** (the user-facing half of this documentation), is today's `tokens.css` written in this format — both modes, shorthand wherever the derivation reproduces the stock value. It doubles as the fidelity test's fixture, and what it _couldn't_ say in shorthand is the honest measure of the format's reach:

- `surface`, `warning`, `success` are bare strings in both modes — one colour each regenerates every background, and the whole neutral scale falls out of `surface` + `text`. `border` is absent entirely: the stock borders derive from `surface`/`text` to within 2/255, so nothing needs saying.
- `text` needs the object form (`body` + `muted`) — see the two-anchor finding above.
- `brand.dark` (light mode) and `accent.dark` (dark mode) are the only pinned ladder steps. The first is a hand-picked saturating darken the shared rule lands 9/255 off; the second is where the stock dark theme contradicts its own principle — `tokens.css` says a `-dark` variant flips _lighter_ on a dark ground, `--primary-dark` obeys, and `--secondary-dark` goes the other way. Everything else in both ladders derives to Δ≤8.
- Both `gradient`s are given explicitly, because the stock hero gradients are deliberately _not_ brand ladders — `--gradient-primary` runs orange → red across two hues neither of which is `--primary-main`.
- `danger.background` is pinned: `--error-bg` is a hand-picked pink/maroon, not a page↔danger mix (Δ6 light, Δ15 dark).
- `status` carries the five that aren't aliases (`shipped`, `delivered`, `received`, and `verified`/`finalised`, whose green differs from `--success-main`). The other four — `new`, `allocated`, `picked`, `cancelled` — are omitted because they alias roles already set.
- `warning` needs its object form, because the palette carries two ambers with **disjoint consumers**: `--color-warning` `#f2a001` is inline caution — the DataTable selected+warning row tint, `--status-picked` (it also tinted the field **error** glyph in TextField / TextArea / Checkbox / Combobox until 2026-08-11, when that glyph was made to inherit the error line's own `--error-main`: an amber triangle over red text read as a second, milder severity on one message) — while `--warning-main` `#ed6c02` is the warning _severity panel_ and nothing else (Alert, Badge). That's a real distinction, so it's `warning.alert`, not an escape-hatch entry (Carl asked; consumers checked 2026-07-30). It is nonetheless the palette's only role split of its kind — `danger` serves both panel and inline from one `--error-main`, and `info` just aliases the accent — so **whether `--warning-main` should exist at all is an open design-system question**, noted in DESIGN_STANDARDS. It is MUI's untouched default (see the Alert row in UI_ELEMENTS), whereas `--color-warning` is the amber the brand standards were reconciled against. If the two are unified in `tokens.css`, `warning.alert` becomes redundant and the role goes back to a bare string; the format doesn't force that decision either way.

That is 11 pinned values across ~65 tokens, and no `tokens` entries at all — the escape hatch turned out to be unnecessary for the hardest possible case. A site theme would pin far fewer: every one of those pins is a place the design system deliberately broke its own pattern.

`tokens` honours only names inside the theme contract that the role map classifies as themable; anything else (a spacing token, `--qr-foreground`, a typo) is warned about and ignored, like any other unrecognised key. It exists so a one-off need never forces a format change, and it is documented as the last resort.

## Rules

### Partial means partial, at role granularity

Specifying `brand` rewrites the brand-derived tokens and **nothing else**. The stock surface scale, ink, borders and statuses stay byte-identical, because the compiler emits declarations only for groups the author mentioned. This is why a partial theme can never shift a colour the author didn't ask about — the alternative (always re-deriving the whole palette from whatever roles are known) would round-trip today's hand-tuned values through the derivation table and move them a shade.

Within a mentioned group, explicit members win and the rest derive from the group's base.

### Single-block themes and dark mode

A single-block theme (top-level roles, or only `light`) is a **light** theme. In dark mode:

- the **hue** roles carry over — `brand`, `accent`, `danger`, `warning`, `success`, `status` — with their light/dark variants derived using the dark-mode recipes, so a ministry's blue is still the ministry's blue in dark mode;
- the **neutral** roles do **not** — `surface`, `text`, `border` keep the stock dark values. A `page: "#ffffff"` written for light mode must not be applied to dark mode, and dark mode's surface/ink pairs are hand-tuned for contrast (see the `--color-divider` note in `tokens.css`).

To control dark surfaces, add a `dark` block. This rule is stated in the Settings UI help text, not just here.

### Deliberately not derived

`shipped`, `delivered`, `received` have their own hues with no palette relationship, so they are settable but never derived. The other six statuses default to aliases of the roles above (`new` → the mid grey, `allocated` → `accent`, `picked` → `warning`, `cancelled` → `danger`, `verified`/`finalised` → `success`), exactly as `tokens.css` does today — and four of them (`new`, `allocated`, `picked`, `cancelled`) are literally `var()` aliases in `tokens.css`, so they follow their role with nothing emitted at all.

### The neutral family is one unit

`surface`, `text` and `border` emit **together**: mentioning any one of them emits all three groups' tokens. They share the same two anchors (the page colour and the muted ink), so moving the page without moving the greys mixed from it would leave light-theme greys on a dark page. This is the one place the "partial at role granularity" rule is coarser than a single role — the family is the honest unit, and re-emitting an untouched neutral costs nothing because the recipe reproduces its stock value.

## How derivation works

Each themable token has one **recipe row** per mode:

The live table is [`src/ui/branding/themeRecipes.ts`](../branding/themeRecipes.ts); a row is a `mix` (a `color-mix` between two anchors), a `shade` (a lightness/chroma step in `oklch`), a `ring`, a `gradient`, or a `contrast` pick:

```
token             light                                  dark
--bg-drawer       mix(page, body, 95%)                   mix(page, black, 76%)
--gray-main       mix(page, muted, 35%)                  mix(page, muted, 9%)
--primary-light   shade(brand, l×1.08, c×0.78)           shade(brand, l×1.12, c×0.70)
--primary-dark    shade(brand, l×0.87, c×0.94)           shade(brand, l×1.10, c×0.82)
--focus-ring      0 0 0 0.1875rem mix(accent, transparent, 25%)   …45%
```

Percentages are the share of the **first** anchor, matching `color-mix` itself.

Three properties make this safe rather than clever:

1. **Neutrals derive from _two_ ink anchors, not one.** Surfaces (`--bg-*`) sit on the page → `text.body` line; the greys, borders and disabled ink (`--gray-*`, `--color-border-value`, `--header-border`, `--input-border`, `--text-disabled`) sit on the page → `text.muted` line, which in the stock palette is a distinctly bluer navy. Anchoring everything on `body` — the obvious single-anchor design — misses the grey family by 7–9/255 per channel and the borders by 3; re-anchoring them on `muted` brings the greys to 1–5 and the borders to 1–2. `text.muted` is therefore a real derivation input, not a convenience member: a theme that sets `text` as a bare string gets a `muted` derived from `body`, and its greys shift a shade. Measured while writing [system-theme.example.json](./custom_themes/system-theme.example.json).
2. **The amounts are fitted to the stock palette, not invented.** Feeding the stock inputs back in reproduces today's values — `surface.page: "#fff"` + `text.body: "#1c1c28"` + `text.muted: "#555770"` regenerates `--bg-toolbar` `#fafafc` (98%, Δ1), `--bg-drawer` `#f2f2f5` (95%, Δ2), `--table-card-surface` `#f4f5f7` (96%, Δ2), `--input-border` `#c0c0c4` (72%, Δ1), `--color-border-value` `#e4e4eb` (84%, Δ3), `--gray-main` `#8f90a6` (35%, Δ4), `--text-disabled` `#7a7b90` (21%, Δ2). Dark is tighter still — the four chrome surfaces (`--bg-drawer`, `--bg-toolbar`, `--header-bg`, `--table-card-surface`) come back **exact** from page → black. The composite recipes fit exactly too: the stock light `--focus-ring` _is_ `--secondary-main` at 25%, and `--focus-ring-error` _is_ `--error-main` at 20%. `customTheme.test.ts` asserts the round-trip **within 5/255 per channel** for every neutral token in both modes, and within 9 for the four hue-ladder tokens, using the example file as its fixture — so the derivation table can't drift from the design system it was fitted to.
3. **Recipes compile to CSS, not to computed hex.** The emitted declaration is `--bg-drawer: color-mix(in srgb, var(--bg-white) 95%, var(--text-body));`. It reads correctly in devtools, it resolves against whatever the author set (or the stock value, if they set neither), and it needs no colour maths at runtime. Neutral mixes use `color-mix(in srgb, …)`, the space the percentages were fitted in. The hue ladders use **relative colour syntax** — `oklch(from var(--primary-main) calc(l * 1.08) calc(c * 0.78) h)` — which keeps the hue and steps lightness and chroma: mixing toward white/black desaturates, and missed the stock `--primary-dark` by 17/255 where this lands within 9. Both features are far under the enforced Chromium floor of 138 (`color-mix` needs 111, relative colour syntax 119 — `scripts/check-min-browser.mjs`).

The round-trip has also been **verified in a real engine**, not only against the node reference implementation the test uses: driving headless Chromium over the emitted stylesheet and sampling each token's painted pixel put all 97 token/mode pairs inside tolerance, worst Δ9 (light `--secondary-dark`). Worth repeating if the recipe kinds ever change, since only a browser can prove the emitted syntax parses.

JavaScript colour maths is needed in exactly two places, both about contrast rather than tinting: choosing `brand.on` / `text.onGradient` (white vs. dark ink) when the author doesn't supply it, and computing the contrast **warnings**. Hence the hex/rgb/hsl-only rule for role colours.

### Role → token coverage

Complete, so that adding a colour token to the contract forces a themability decision (enforced — see [Tooling](#tooling-and-enforcement)).

| Role          | Tokens                                                                                                                                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brand`       | `--primary-main` `--primary-light` `--primary-dark` `--primary-contrast` `--gradient-primary`                                                                                                                                                                        |
| `accent`      | `--secondary-main` `--secondary-light` `--secondary-dark` `--info-main` `--focus-ring` `--bg-icon` `--gray-pale` `--gradient-secondary` `--status-allocated`                                                                                                         |
| `danger`      | `--error-main` `--error-bg` `--focus-ring-error` `--status-cancelled`                                                                                                                                                                                                |
| `warning`     | `--warning-main` `--color-warning` `--status-picked`                                                                                                                                                                                                                 |
| `success`     | `--success-main` `--status-verified` `--status-finalised`                                                                                                                                                                                                            |
| `surface`     | `--bg-white` `--surface-raised` `--table-card-surface` `--bg-drawer` `--bg-menu` `--bg-toolbar` `--bg-row` `--bg-group-light` `--bg-group-main` `--bg-group-dark` `--bg-input` `--bg-disabled` `--header-bg` `--drawer-selected-bg` `--drawer-hover-bg` `--bg-login` |
| `text`        | `--text-body` `--text-secondary` `--text-label` `--button-text` `--text-disabled` `--gray-main` `--gray-light` `--gray-dark` `--login-hero-text` (also emitted by `brand` — the hero ink is contrast-picked from the brand gradient it sits on)                      |
| `border`      | `--color-border-value` `--color-divider` `--input-border` `--header-border` `--outline-main`                                                                                                                                                                         |
| `status`      | the nine `--status-*`                                                                                                                                                                                                                                                |
| `tokens` only | `--shadow-1`…`--shadow-4` `--shadow-drawer` `--shadow-frozen-col` `--overlay-scrim` — themable, but no role reaches them (no `shadow` role); a `tokens` entry carries the whole `box-shadow` value                                                                   |
| not themable  | `--qr-foreground` `--qr-background` (scanner reliability), `--disabled-opacity` (not a colour), everything below the `@theme-contract` markers                                                                                                                       |

Note `--warning-main` (alert orange) and `--color-warning` (the CCE amber) are distinct tokens today but both come from `warning.base`; a site that genuinely wants them different uses `tokens`.

## Applying a theme

```ts
// src/ui/branding/customTheme.ts — pure, colocated tests
compileTheme(text: string): {
  css: string;
  errors: ThemeProblem[];    // block the save
  warnings: ThemeProblem[];  // shown, don't block
};
```

Emitted CSS is one block per mode — this is the real output for `{ "brand": "#0b6e99" }`:

```css
:root:root {
  --primary-light: oklch(
    from var(--primary-main) calc(l * 1.08) calc(c * 0.78) h
  );
  --primary-dark: oklch(
    from var(--primary-main) calc(l * 0.87) calc(c * 0.94) h
  );
  --primary-contrast: #fff;
  --gradient-primary: linear-gradient(
    156deg,
    var(--primary-light) 4%,
    var(--primary-dark) 96%
  );
  --primary-main: #0b6e99;
}
:root:root[data-theme='dark'] {
  /* the same roles, with the dark-mode recipes */
}
```

Note the ordering inside a block: derived tokens are written first and the author's literals last, so an explicitly-set member always wins over its own recipe.

The doubled `:root:root` is deliberate: it outranks both `:root` and `:root[data-theme='dark']` in `tokens.css` regardless of stylesheet order (dev-server style injection and HMR both append), while keeping the custom dark block ahead of the custom light block. The result is injected as a single `<style id="oms-custom-theme">` appended to `<head>`.

Lifecycle:

- **Pre-paint.** The compiled CSS is cached in `localStorage` (`oms-custom-theme-css`, alongside the existing `oms-theme` key) and injected by the inline script in `index.html`, so a themed site never flashes TMF orange on load. The pre-paint script stays a few lines of ES5 — it injects a string, it does not compile.
- **At startup**, not after login: `fetchDisplaySettings()` joins the `Promise.all` in `App.runStartup` beside `fetchServerInfo()`. The query runs on the server's `basic_context()`, i.e. unauthenticated, which is the point — the login and initialisation screens are the branded hero pages, so branding has to land before anyone signs in. It sends the cached hashes, so an unchanged theme costs one small round-trip and no work.
- **On save** in Settings: compile first, refuse the save on errors, then persist, cache (using the hash the mutation returns, so the reload paints the new theme pre-paint), and reload the app — the behaviour spec/settings/rules.md requires.
- **On clear** (toggle off): drop the cache and remove the style element in place — immediate, no reload.

One server subtlety worth knowing when touching this: a `null` field in the response means "unchanged from the hash you sent" **or** "never set" — the server cannot distinguish them (`display_settings.rs`, `match_node`). Both mean "keep what you have". A setting that was _cleared_ comes back as an empty value with its own hash, not as `null`, which is how clearing on another device still reaches this one.

**Failure is inert.** An invalid declaration is dropped by the CSS parser, so a bad theme cannot white-screen the app or block the Settings page that removes it. That is the answer to the ⚠️ VERIFY in spec/settings/rules.md: a valid-JSON-but-wrong-shape document is now either refused at save time (nothing recognised) or applied as far as it is understood with the rest warned about — and anything that still slips through degrades cosmetically, with the toggle as a working recovery path.

## Validation and error reporting

Everything reportable is reported at once, never first-only, and the two severities are drawn along one line: **an error means we couldn't apply the document; a warning means we applied what we understood and skipped the rest.**

**Errors** (save refused) — only three:

- malformed JSON, with line/column;
- top-level roles mixed with a `light`/`dark` key (ambiguous, so nothing is applied);
- **nothing in the document was recognised** — zero declarations would be emitted. This is the guard that keeps "unknown keys are warnings" from turning a wholly wrong document into a silent no-op: a legacy MUI theme, a theme for some other product, or `{}` with a typo'd role name would otherwise save cleanly and change nothing. The message names the closest match it can find, and the MUI shape gets its own wording (see [Legacy themes](#legacy-themes)).

**Warnings** (saved and applied, listed under the editor):

- unknown role, member or `tokens` key — ignored, with a "did you mean" for near misses (Carl, 2026-07-30). A theme is server-persisted and travels across app versions, so an unrecognised key is as likely to be a key this build doesn't have yet as a typo; refusing the whole document over one line is the worse failure. The did-you-mean plus the nothing-recognised error above cover the typo case.
- wrong type for a role or member, and unparseable colours — that member is skipped, the rest of the group still applies.
- contrast: text-on-surface pairs below WCAG AA 4.5:1 (`text.body` and `text.muted` against `surface.page`, `surface.nav`, `surface.input`), `brand.on` against `brand.base`, status/severity hues below 3:1 against their surface, and a `brand`/`accent` base too close to `surface.page` to be visible. Accessibility is the baseline here (`src/ui/CLAUDE.md` #9) and a theme is the one place a site can break AA everywhere at once — but a warning, not a veto: the author may have a reason, and we shouldn't be the last word on their brand.

Warnings are computed per mode, and are the reason validation lives in a pure module rather than in the Settings component: they're worth unit-testing directly.

## Settings UI

The existing `EditorToggleRow` in [DisplaySettingsSection.tsx](../../sections/settings/display/DisplaySettingsSection.tsx) keeps its shape — toggle on reveals the editor, save is explicit, toggle off clears immediately. What changed:

1. `parseThemeJson` in [displayLogic.ts](../../sections/settings/display/displayLogic.ts) became `checkTheme`, backed by `compileTheme`, so the save gate is shape-aware; the single `Alert` became a list of errors and, separately, warnings.
2. The empty seed became a minimal real document (`{ "brand": "#0b6e99" }`) rather than `{}`, plus an `InfoTooltip` naming the roles — the logo row already had this shape.
3. **Warnings are live, errors are not.** A successful save reloads the app, so a warning only reported afterwards would never be read; warnings therefore describe the text as it stands, while errors appear on a save attempt (half-typed JSON is not an error yet).
4. The **logo** row now applies what it saves: `AppLogo` reads a signal, so the drawer and hero logos change the moment it saves or clears, with no reload — the theme's reload is only needed because CSS custom properties are set at the document root.

There is deliberately **no Preview** (Carl, 2026-07-30): saving already applies the theme via the app reload, and the toggle reverts it, so "install it and look" is the preview. That also keeps the Settings behaviour a reconciliation of the reference app rather than an addition to it.

New locale keys go in `src/intl/locales/en/` only. The validation list gets a testid (`custom-theme-problems`) per `e2e/TESTIDS.md`.

A dev-only showcase page (`#/showcase/theming`) is the natural authoring surface: the role table, a paste-a-document box, live preview, and the contrast report. Worth doing, but it is not on the critical path — and being dev-only, it is dead-code-eliminated from production builds, so it costs the app nothing.

## Tooling and enforcement

- `scripts/check-theme-tokens.mjs` has a third check: every token named in `themeRecipes.ts` exists in the contract, and every contract token is either covered by a role/recipe or listed in `NOT_THEMABLE`. Adding a colour token therefore can't silently become unthemable. It reads the table with a regex rather than importing it — node can't strip TypeScript — which is why the token keys there are plain single-quoted literals, noted on both sides.
- Colocated unit tests (`customTheme.test.ts`, 22): the stock round-trip fidelity test (above), partial emission, the neutral family moving as a unit, single-block dark carry-over, explicit members beating their recipes, and one case per validation problem.
- **Not covered by unit tests:** `applyBranding.ts` needs a DOM, and vitest runs in the node environment here (adding jsdom for one file would buy a dependency to test ~40 lines). Its two risky parts were verified by driving headless Chromium instead — the emitted CSS resolving to the right pixels, and the SVG sanitiser stripping `<script>`, `on*` handlers, `<foreignObject>` and external `href`s while keeping same-document `#refs`. Repeat that if either changes.
- No new dependency, at all. The colour parser and contrast maths are ~90 lines; everything else is CSS the browser evaluates.

## Rejected alternatives

- **A flat list of token names** (`{"--bg-group-dark": "#e2e2e9"}`) — the thing this design exists to avoid. Also freezes our internal token names into a public, server-persisted document, so renaming a token becomes a breaking change for every site.
- **Accept the reference app's MUI theme objects** (`{"palette": {"primary": {"main": …}}}`) — a format defined by a library this app doesn't use, with a large surface (`components`, `mixins`, `typography`) we'd have to either honour or silently drop. See [Legacy themes](#legacy-themes) for the migration path instead.
- **Derive everything from one seed colour.** Tempting for the one-line case, but it can only produce a generated palette; it can't express "our blue, but keep the stock greys", which is what sites actually ask for. The role model gets the one-liner anyway.
- **Always re-derive the full palette from known roles** — drops the partial-means-partial guarantee and quietly moves hand-tuned values.
- **Merge semantics for top-level + `light`/`dark`** (top-level as shared base) — strictly more expressive, but it makes "is this the light theme or the shared base?" ambiguous at a glance, and the hue carry-over rule already covers the case people want.
- **Auto-lift a too-dark brand colour in dark mode** to clear 3:1 against the dark surface. Real accessibility need, but silently altering the site's brand colour is worse than telling the author. Warn instead; revisit if warnings get ignored in practice.
- **YAML/TOML for friendlier authoring** — needs a parser dependency for a document edited a handful of times per site.
- **Themable typography/spacing** — the fastest route to a broken layout, and no site has asked. The contract markers already draw this line.
- **Unknown keys as errors** — catches typos harder, but a server-persisted document that a newer build extends would then fail wholesale on an older build, and one stale line would throw away a whole valid theme. Warn-and-ignore, backstopped by the nothing-recognised error (Carl, 2026-07-30).
- **A `shadow` role** — least-demanded, most delicate; `tokens` covers it until a site actually asks (Carl, 2026-07-30).
- **A Preview button in Settings** — the install/revert loop is already the preview, and it keeps this a reconciliation rather than a spec addition (Carl, 2026-07-30).
- **An in-app legacy-theme converter** — bundle cost for a migration aid with a shelf life; a standalone script does the same job with no app footprint (Carl, 2026-07-30). See [Legacy themes](#legacy-themes).

## Legacy themes

A store upgrading from the reference app may already have a MUI-shaped theme saved server-side. It won't apply here — every key is unrecognised, so the nothing-recognised error fires — and the app's only job is to say so in those words: the compiler detects the shape (top-level `palette` / `typography` / `mixins` / `components`) and reports "this is a theme from the previous app version, convert it first" instead of a generic message. Five lines.

**Conversion is a standalone dev utility, not app code** (Carl, 2026-07-30): `scripts/convert-legacy-theme.mjs`, run as `node scripts/convert-legacy-theme.mjs old.json > new.json`, printing what it dropped to stderr. It is never imported by the app, so it costs zero bundle for something that goes obsolete as sites migrate, and support can convert a JSON blob without running the app at all.

It's easy because the reference app deep-merges the saved document over its own `themeOptions` (`client/packages/common/src/styles/theme.ts`), so a real saved theme is a subset of that tree holding **literal colour values** — the conversion is a table of dotted paths, with no colour maths:

| Legacy path                                                                                                                   | Role member                                                              |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `palette.primary.main` / `.light` / `.dark` / `.contrastText`                                                                 | `brand.base` / `.light` / `.dark` / `.on`                                |
| `palette.secondary.*`, `palette.info.main`                                                                                    | `accent.*`                                                               |
| `palette.error.main` / `.background`                                                                                          | `danger.base` / `.background`                                            |
| `palette.background.white` / `.drawer` / `.menu` / `.toolbar` / `.row` / `.group.*` / `.input.*` / `.login` / `.icon`         | the matching `surface` members                                           |
| `palette.gray.*`, `palette.form.field` / `.label`, `typography.body1.color`, `typography.login.color`                         | `text.*` (`gray.pale` → `accent`-tinted)                                 |
| `palette.border`, `palette.divider`, `palette.outline.main`, `mixins.header.borderBottom`                                     | `border.base` / `.divider` / `.strong` / `.input`                        |
| `mixins.gradient.primary` / `.secondary`                                                                                      | `brand.gradient` / `accent.gradient`                                     |
| `mixins.drawer.selectedBackgroundColor` / `.hoverBackgroundColor`, `mixins.header.backgroundColor`, `mixins.button.textColor` | `surface.navSelected` / `surface.nav` / `surface.header` / `text.button` |

~35 rows. The only fiddly one is `mixins.header.borderBottom`, where the colour has to be picked out of a `1px solid #cbced4` shorthand. Reported as dropped, with a reason: `components` style overrides (arbitrary MUI CSS), everything sized (`zIndex`, `breakpoints`, `mixins.table`, `icon`, `footer` — not themable here by design), and the palette groups with no counterpart in our tokens yet (`chart.*` incl. `chart.lines`, `cceStatus.*`, `invoiceLineStatus.*`, `vaccinationStatus.*`, `programs.*`).

## Where the code lives

| File                                                               | Role                                                                                                                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`src/ui/branding/customTheme.ts`](../branding/customTheme.ts)     | The pure compiler: colour parsing, contrast, `compileTheme(text) → { css, errors, warnings }`. No DOM, no app imports, so it runs in vitest's node environment.    |
| [`src/ui/branding/themeRecipes.ts`](../branding/themeRecipes.ts)   | The fitted recipe table, the role/member map, and `NOT_THEMABLE`. Parsed by `scripts/check-theme-tokens.mjs`, so its token keys stay plain single-quoted literals. |
| [`src/ui/branding/applyBranding.ts`](../branding/applyBranding.ts) | The DOM side: the `<style id="oms-custom-theme">` element, the `localStorage` cache, and the custom-logo signal + SVG sanitiser.                                   |
| [`src/ui/branding/AppLogo.tsx`](../branding/AppLogo.tsx)           | The site's logo or the stock mSupply guy — used by the drawer, login and initialisation heroes.                                                                    |
| [`src/api/displaySettings.ts`](../../api/displaySettings.ts)       | The startup fetch, alongside `fetchServerInfo` in `App.runStartup`.                                                                                                |

Two things are deliberately **not** done: the standalone `scripts/convert-legacy-theme.mjs` (see [Legacy themes](#legacy-themes)) and the dev-only `#/showcase/theming` authoring page. The dev showcase does inherit custom theming for free, since it runs inside `index.html`; the standalone showcase build does not, because `showcase.html` deliberately omits the app-only pre-boot scripts.

## Decisions taken

All four open questions from the review are settled (Carl, 2026-07-30) and folded into the sections above: unknown keys **warn and are ignored** (backstopped by the nothing-recognised error); **no `shadow` role** — `tokens` only; **no Preview** — install and revert is the preview; **conversion is a standalone script**, with only the "this is a previous-version theme" message living in the app.
