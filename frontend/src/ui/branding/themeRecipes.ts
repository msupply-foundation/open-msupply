/*
 * Custom-theme recipe table — the single source of truth for WHICH tokens a
 * custom theme can reach and HOW each derives (see src/ui/docs/CUSTOM_THEMES.md
 * and kdd/custom-themes).
 *
 * Two hard rules keep this honest:
 *
 *  1. Every amount below is FITTED to the stock tokens.css values, not
 *     invented — feeding the stock inputs back in reproduces today's palette
 *     (customTheme.test.ts asserts it against system-theme.example.json).
 *  2. Recipes compile to CSS (color-mix / relative oklch), never to computed
 *     hex, so a derived token resolves against whatever the author set — or
 *     against the stock value, when they set neither.
 *
 * NB scripts/check-theme-tokens.mjs parses THIS FILE with a regex over
 * `'--token':` keys to prove the role map covers every colour token in the
 * theme contract. Keep the token keys as plain single-quoted literals.
 */

/*
 * Anchors are the role inputs a recipe can mix between. Each resolves to a
 * var() reference (or a literal, for white/black) at emit time, which is what
 * lets a recipe track a token the author didn't set.
 */
export type Anchor =
  | 'page' // --bg-white        (surface.page)
  | 'body' // --text-body       (text.body)
  | 'muted' // --text-secondary  (text.muted)
  | 'brand' // --primary-main
  | 'accent' // --secondary-main
  | 'danger' // --error-main
  /* What the login hero paints under its strapline: the brand colour, or —
     when a gradient is given — its last stop, since the text is bottom-
     aligned and the sweep runs top → bottom. Contrast recipes only, never
     emitted as a var(). */
  | 'hero'
  | 'white'
  | 'black';

export const ANCHOR_VALUE: Record<Anchor, string> = {
  page: 'var(--bg-white)',
  body: 'var(--text-body)',
  muted: 'var(--text-secondary)',
  brand: 'var(--primary-main)',
  accent: 'var(--secondary-main)',
  danger: 'var(--error-main)',
  hero: 'var(--primary-main)',
  white: '#fff',
  black: '#000',
};

export type Recipe =
  /* color-mix(in srgb, <a> p%, <b>) — p is the share of `a`. */
  | { kind: 'mix'; a: Anchor; b: Anchor; p: number }
  /* oklch(from <from> calc(l * L) calc(c * C) h) — a lightness/chroma step
     that keeps the hue. Beats mixing toward white/black, which desaturates:
     the stock ladders keep their chroma (measured — mixing missed
     --primary-dark by 17/255; this lands within 9). */
  | { kind: 'shade'; from: Anchor; l: number; c: number }
  /* The focus glows: fixed geometry, themed colour at a per-mode alpha. */
  | { kind: 'ring'; from: Anchor; alpha: number }
  /* The two hero gradients, built from the group's own light/dark variants. */
  | { kind: 'gradient'; from: string; to: string }
  /* White or dark ink, whichever contrasts better with the anchor. The one
     recipe computed in JS rather than emitted as CSS (CSS has no
     contrast-picking function we can rely on). */
  | { kind: 'contrast'; from: Anchor };

export type ModeRecipes = { light: Recipe; dark: Recipe };

const shade = (from: Anchor, l: number, c: number): Recipe => ({
  kind: 'shade',
  from,
  l,
  c,
});
const mix = (a: Anchor, b: Anchor, p: number): Recipe => ({
  kind: 'mix',
  a,
  b,
  p,
});

/*
 * ============================ THE TABLE ============================
 * Only tokens named here (or in LITERAL_TOKENS / NOT_THEMABLE) are themable.
 *
 * The hue ladders use ONE rule per (mode, variant), applied to both brand and
 * accent, so the same input colour always ladders the same way — per-hue
 * constants would fit the stock palette a shade closer but would make
 * `{brand: X, accent: X}` produce two different lights.
 *
 * The dark/dark rule is fitted to primary alone, because primary is the one
 * that follows the dark theme's own stated principle (a "-dark" variant flips
 * LIGHTER on a dark ground — tokens.css). The stock --secondary-dark goes the
 * other way; that is an exception in the palette, pinned in the example theme
 * rather than modelled here.
 */
export const TOKEN_RECIPES: Record<string, ModeRecipes> = {
  // --- brand ---------------------------------------------------------
  '--primary-light': {
    light: shade('brand', 1.08, 0.78),
    dark: shade('brand', 1.12, 0.7),
  },
  '--primary-dark': {
    light: shade('brand', 0.87, 0.94),
    dark: shade('brand', 1.1, 0.82),
  },
  '--primary-contrast': {
    light: { kind: 'contrast', from: 'brand' },
    dark: { kind: 'contrast', from: 'brand' },
  },
  '--gradient-primary': {
    light: { kind: 'gradient', from: '--primary-light', to: '--primary-dark' },
    dark: { kind: 'gradient', from: '--primary-light', to: '--primary-dark' },
  },

  // --- accent --------------------------------------------------------
  '--secondary-light': {
    light: shade('accent', 1.08, 0.78),
    dark: shade('accent', 1.12, 0.7),
  },
  '--secondary-dark': {
    light: shade('accent', 0.87, 0.94),
    dark: shade('accent', 1.1, 0.82),
  },
  '--gradient-secondary': {
    light: {
      kind: 'gradient',
      from: '--secondary-light',
      to: '--secondary-dark',
    },
    dark: {
      kind: 'gradient',
      from: '--secondary-light',
      to: '--secondary-dark',
    },
  },
  // Accent-tinted surfaces: the icon plate and the pale selection blue.
  '--bg-icon': {
    light: mix('page', 'accent', 0.86),
    dark: mix('page', 'accent', 0.854),
  },
  '--gray-pale': {
    light: mix('page', 'accent', 0.73),
    dark: mix('page', 'accent', 0.8),
  },
  // The stock light ring IS the action blue at 25% — fitted exactly.
  '--focus-ring': {
    light: { kind: 'ring', from: 'accent', alpha: 0.25 },
    dark: { kind: 'ring', from: 'accent', alpha: 0.45 },
  },

  // --- danger --------------------------------------------------------
  '--error-bg': {
    light: mix('page', 'danger', 0.74),
    dark: mix('danger', 'black', 0.3),
  },
  '--focus-ring-error': {
    light: { kind: 'ring', from: 'danger', alpha: 0.2 },
    dark: { kind: 'ring', from: 'danger', alpha: 0.4 },
  },

  // --- surfaces ------------------------------------------------------
  // Light: every surface steps toward the ink. Dark: chrome steps toward
  // black (darker than the page) while raised surfaces step toward the ink
  // (lighter) — the inverted scale tokens.css describes.
  '--bg-drawer': {
    light: mix('page', 'body', 0.95),
    dark: mix('page', 'black', 0.76),
  },
  '--bg-menu': {
    light: mix('page', 'body', 0.95),
    dark: mix('page', 'black', 0.76),
  },
  '--bg-toolbar': {
    light: mix('page', 'body', 0.98),
    dark: mix('page', 'black', 0.9),
  },
  '--bg-row': {
    light: mix('page', 'body', 0.98),
    dark: mix('page', 'black', 0.9),
  },
  '--bg-group-light': {
    light: mix('page', 'body', 0.98),
    dark: mix('page', 'black', 0.9),
  },
  '--bg-group-main': {
    light: mix('page', 'body', 0.95),
    dark: mix('page', 'body', 0.97),
  },
  '--bg-group-dark': {
    light: mix('page', 'muted', 0.84),
    dark: mix('page', 'muted', 0.86),
  },
  '--bg-input': {
    light: mix('page', 'body', 0.95),
    dark: mix('page', 'body', 0.95),
  },
  '--bg-disabled': {
    light: mix('page', 'body', 0.95),
    dark: mix('page', 'body', 0.95),
  },
  '--header-bg': {
    light: mix('page', 'body', 0.98),
    dark: mix('page', 'black', 0.78),
  },
  '--table-card-surface': {
    light: mix('page', 'body', 0.96),
    dark: mix('page', 'black', 0.83),
  },
  '--surface-raised': {
    light: mix('page', 'body', 1),
    dark: mix('page', 'muted', 0.91),
  },
  '--drawer-selected-bg': {
    light: mix('page', 'body', 1),
    dark: mix('page', 'body', 0.94),
  },
  '--drawer-hover-bg': {
    light: mix('page', 'body', 0.98),
    dark: mix('page', 'body', 1),
  },
  '--bg-login': {
    light: mix('page', 'body', 0.95),
    dark: mix('page', 'black', 0.76),
  },

  // --- ink -----------------------------------------------------------
  // The greys hang off `muted`, NOT `body`: the stock greys sit on a bluer
  // line than page→body, and anchoring them on body misses by 7–9/255.
  '--text-secondary': {
    light: mix('page', 'body', 0.29),
    dark: mix('page', 'body', 0.3),
  },
  '--gray-dark': {
    light: mix('page', 'muted', 0),
    dark: mix('muted', 'body', 0.74),
  },
  '--outline-main': {
    light: mix('page', 'muted', 0),
    dark: mix('muted', 'body', 0.74),
  },
  '--gray-main': {
    light: mix('page', 'muted', 0.35),
    dark: mix('page', 'muted', 0.09),
  },
  '--gray-light': {
    light: mix('page', 'muted', 0.7),
    dark: mix('page', 'muted', 0.68),
  },
  '--text-disabled': {
    light: mix('page', 'muted', 0.21),
    dark: mix('page', 'muted', 0.13),
  },
  '--text-label': {
    light: mix('body', 'muted', 0.73),
    dark: mix('body', 'muted', 0.66),
  },
  '--button-text': {
    light: mix('page', 'body', 0.11),
    dark: mix('body', 'muted', 0.57),
  },
  '--login-hero-text': {
    light: { kind: 'contrast', from: 'hero' },
    dark: { kind: 'contrast', from: 'hero' },
  },

  // --- borders -------------------------------------------------------
  '--color-border-value': {
    light: mix('page', 'muted', 0.84),
    dark: mix('page', 'muted', 0.86),
  },
  '--color-divider': {
    light: mix('page', 'body', 0.9),
    dark: mix('page', 'muted', 0.86),
  },
  '--input-border': {
    light: mix('page', 'body', 0.72),
    dark: mix('page', 'muted', 0.78),
  },
  '--header-border': {
    light: mix('page', 'muted', 0.7),
    dark: mix('page', 'muted', 0.86),
  },
};

export type RoleName =
  | 'brand'
  | 'accent'
  | 'danger'
  | 'warning'
  | 'success'
  | 'surface'
  | 'text'
  | 'border'
  | 'status';

export type RoleSpec = {
  /** Member a bare colour string is shorthand for. */
  shorthand: string;
  /** Member name → the token(s) it sets literally. */
  members: Record<string, string[]>;
  /** Every token the group emits when the author mentions it. */
  tokens: string[];
};

/*
 * The role vocabulary. `members` is what an author may write; `tokens` is what
 * the group emits — the union of its members' tokens and the derived ones that
 * hang off them, so mentioning a role recolours the whole group coherently.
 */
export const ROLES: Record<RoleName, RoleSpec> = {
  brand: {
    shorthand: 'base',
    members: {
      base: ['--primary-main'],
      light: ['--primary-light'],
      dark: ['--primary-dark'],
      on: ['--primary-contrast'],
      gradient: ['--gradient-primary'],
    },
    tokens: [
      '--primary-main',
      '--primary-light',
      '--primary-dark',
      '--primary-contrast',
      '--gradient-primary',
      // The login hero's strapline sits ON the brand gradient, so its ink is
      // contrast-picked from the brand and has to move with it: a site with a
      // pale brand would otherwise keep near-white text on a pale hero. Also
      // reachable as `text.onGradient` for an author who wants it pinned.
      '--login-hero-text',
    ],
  },
  accent: {
    shorthand: 'base',
    members: {
      base: ['--secondary-main'],
      light: ['--secondary-light'],
      dark: ['--secondary-dark'],
      gradient: ['--gradient-secondary'],
    },
    tokens: [
      '--secondary-main',
      '--secondary-light',
      '--secondary-dark',
      '--gradient-secondary',
      '--bg-icon',
      '--gray-pale',
      '--focus-ring',
    ],
  },
  danger: {
    shorthand: 'base',
    members: { base: ['--error-main'], background: ['--error-bg'] },
    tokens: ['--error-main', '--error-bg', '--focus-ring-error'],
  },
  warning: {
    shorthand: 'base',
    // Two ambers with disjoint consumers: `base` is inline caution (field
    // warnings, row tints, Picked status), `alert` is the warning message
    // panel. `alert` falls back to `base`.
    members: { base: ['--color-warning'], alert: ['--warning-main'] },
    tokens: ['--color-warning', '--warning-main'],
  },
  success: {
    shorthand: 'base',
    members: {
      base: ['--success-main', '--status-verified', '--status-finalised'],
    },
    tokens: ['--success-main', '--status-verified', '--status-finalised'],
  },
  surface: {
    shorthand: 'page',
    members: {
      page: ['--bg-white'],
      chrome: ['--bg-toolbar', '--bg-row', '--bg-group-light'],
      nav: ['--bg-drawer', '--bg-menu'],
      navSelected: ['--drawer-selected-bg'],
      header: ['--header-bg'],
      raised: ['--surface-raised'],
      sunken: ['--table-card-surface'],
      input: ['--bg-input'],
      disabled: ['--bg-disabled'],
      login: ['--bg-login'],
    },
    tokens: [], // filled below (the neutral family)
  },
  text: {
    shorthand: 'body',
    members: {
      body: ['--text-body'],
      muted: ['--text-secondary'],
      label: ['--text-label'],
      button: ['--button-text'],
      disabled: ['--text-disabled'],
      onGradient: ['--login-hero-text'],
    },
    tokens: [],
  },
  border: {
    shorthand: 'base',
    members: {
      // The header edge follows the border colour when one is given: an
      // author setting `border` means "make my hairlines this colour", and
      // the stock header/body distinction is not worth preserving against
      // that intent.
      base: ['--color-border-value', '--header-border'],
      divider: ['--color-divider'],
      input: ['--input-border'],
      strong: ['--outline-main'],
    },
    tokens: [],
  },
  status: {
    shorthand: '',
    members: {
      new: ['--status-new'],
      allocated: ['--status-allocated'],
      picked: ['--status-picked'],
      shipped: ['--status-shipped'],
      delivered: ['--status-delivered'],
      received: ['--status-received'],
      verified: ['--status-verified'],
      cancelled: ['--status-cancelled'],
      finalised: ['--status-finalised'],
    },
    tokens: [], // per-member only; a status is set, never derived
  },
};

/*
 * The NEUTRAL FAMILY — surfaces, ink and borders emit together, because they
 * all derive from the same two anchors (page and muted). Changing the page
 * colour without moving the greys that are mixed from it would leave
 * light-theme greys on a dark page; the family is the honest unit.
 */
export const NEUTRAL_FAMILY: string[] = [
  '--bg-white',
  '--bg-drawer',
  '--bg-menu',
  '--bg-toolbar',
  '--bg-row',
  '--bg-group-light',
  '--bg-group-main',
  '--bg-group-dark',
  '--bg-input',
  '--bg-disabled',
  '--header-bg',
  '--table-card-surface',
  '--surface-raised',
  '--drawer-selected-bg',
  '--drawer-hover-bg',
  '--bg-login',
  '--text-body',
  '--text-secondary',
  '--text-label',
  '--button-text',
  '--text-disabled',
  '--gray-main',
  '--gray-light',
  '--gray-dark',
  '--login-hero-text',
  '--color-border-value',
  '--color-divider',
  '--input-border',
  '--header-border',
  '--outline-main',
];
ROLES.surface.tokens = NEUTRAL_FAMILY;
ROLES.text.tokens = NEUTRAL_FAMILY;
ROLES.border.tokens = NEUTRAL_FAMILY;

/*
 * Roles whose colours carry into dark mode when the author wrote a single
 * (light) theme: a site's brand stays its brand in the dark, while the
 * neutrals keep the hand-tuned dark surfaces — a light page colour applied to
 * dark mode would be unreadable.
 */
export const HUE_ROLES: RoleName[] = [
  'brand',
  'accent',
  'danger',
  'warning',
  'success',
  'status',
];

/*
 * Contract colour tokens no role reaches, each with the reason. The coverage
 * guard in scripts/check-theme-tokens.mjs fails if a contract token is in
 * neither this list nor the role map — so adding a colour token forces a
 * themability decision rather than it silently becoming unthemable.
 */
export const NOT_THEMABLE: Record<string, string> = {
  // An alias in tokens.css: its whole job is to track --secondary-main.
  '--info-main': 'aliases --secondary-main',
  // Shadows and the scrim: no role (Carl 2026-07-30), reachable via `tokens`.
  '--shadow-1': 'no shadow role — use `tokens`',
  '--shadow-2': 'no shadow role — use `tokens`',
  '--shadow-3': 'no shadow role — use `tokens`',
  '--shadow-4': 'no shadow role — use `tokens`',
  '--shadow-drawer': 'no shadow role — use `tokens`',
  '--shadow-frozen-col': 'no shadow role — use `tokens`',
  '--overlay-scrim': 'no shadow role — use `tokens`',
};

/** Every token a `tokens` entry may name. */
export const THEMABLE_TOKENS: ReadonlySet<string> = new Set([
  ...Object.values(ROLES).flatMap(role => [
    ...role.tokens,
    ...Object.values(role.members).flat(),
  ]),
  ...Object.keys(TOKEN_RECIPES),
  ...Object.keys(NOT_THEMABLE).filter(token => token !== '--info-main'),
]);
