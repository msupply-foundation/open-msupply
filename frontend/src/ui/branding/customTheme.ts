/*
 * Custom-theme compiler: a theme document (JSON text) → the CSS that applies
 * it, plus everything wrong with it. Pure — no DOM, no app imports — so it is
 * unit-testable in vitest's node environment (applyBranding.ts owns the DOM
 * side). Format reference: src/ui/docs/CUSTOM_THEMES.md.
 *
 * Severity has one dividing line: an ERROR means the document could not be
 * applied at all (nothing is saved); a WARNING means we applied what we
 * understood and skipped the rest.
 */
import {
  ANCHOR_VALUE,
  HUE_ROLES,
  NEUTRAL_FAMILY,
  ROLES,
  THEMABLE_TOKENS,
  TOKEN_RECIPES,
  type Anchor,
  type Recipe,
  type RoleName,
} from './themeRecipes';

export type ThemeProblem = {
  /** Dotted path into the document, e.g. `light.brand.base`. */
  path: string;
  message: string;
};

export type CompileResult = {
  /** CSS to inject; empty when the document could not be applied. */
  css: string;
  errors: ThemeProblem[];
  warnings: ThemeProblem[];
};

type Mode = 'light' | 'dark';
type Rgb = { r: number; g: number; b: number; a: number };

const MODES: Mode[] = ['light', 'dark'];
/*
 * tokens.css --primary-main. Needed only for the hero-ink pick when a theme
 * changes the surfaces but not the brand: the hero still paints the built-in
 * gradient, so the ink has to be chosen against that.
 */
const STOCK_BRAND: Rgb = { r: 233, g: 92, b: 48, a: 1 };
const ROLE_NAMES = Object.keys(ROLES) as RoleName[];
/** Recognised at the top level alongside the role names. */
const DOC_KEYS = ['name', 'light', 'dark', 'tokens', ...ROLE_NAMES];
/** Top-level keys that mark a theme written for the previous (MUI) app. */
const MUI_KEYS = ['palette', 'typography', 'mixins', 'components'];

// --- colour ------------------------------------------------------------

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/*
 * Hex / rgb() / hsl() only. Deliberately narrow: a role colour has to be
 * readable as channels so contrast can be computed, and this covers what
 * people actually paste. Anything else is reported and skipped — except
 * inside `tokens`, which passes values through untouched.
 */
export const parseColour = (input: string): Rgb | undefined => {
  const text = input.trim().toLowerCase();

  const hex = /^#([0-9a-f]{3,8})$/.exec(text);
  if (hex) {
    const d = hex[1];
    const expand = (s: string) => parseInt(s.length === 1 ? s + s : s, 16);
    if (d.length === 3 || d.length === 4)
      return {
        r: expand(d[0]),
        g: expand(d[1]),
        b: expand(d[2]),
        a: d.length === 4 ? expand(d[3]) / 255 : 1,
      };
    if (d.length === 6 || d.length === 8)
      return {
        r: expand(d.slice(0, 2)),
        g: expand(d.slice(2, 4)),
        b: expand(d.slice(4, 6)),
        a: d.length === 8 ? expand(d.slice(6, 8)) / 255 : 1,
      };
    return undefined;
  }

  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(text);
  if (!fn) return undefined;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return undefined;
  const num = (s: string) => parseFloat(s);
  const alpha =
    parts[3] === undefined
      ? 1
      : clamp(
          num(parts[3].replace('%', '')) / (parts[3].includes('%') ? 100 : 1),
          0,
          1
        );
  if (parts.some(p => Number.isNaN(num(p)))) return undefined;

  if (fn[1].startsWith('rgb')) {
    const ch = (s: string) =>
      clamp(s.includes('%') ? (num(s) / 100) * 255 : num(s), 0, 255);
    return { r: ch(parts[0]), g: ch(parts[1]), b: ch(parts[2]), a: alpha };
  }

  // hsl → rgb
  const h = ((num(parts[0]) % 360) + 360) % 360;
  const s = clamp(num(parts[1]) / 100, 0, 1);
  const l = clamp(num(parts[2]) / 100, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] = (
    [
      [c, x, 0],
      [x, c, 0],
      [0, c, x],
      [0, x, c],
      [x, 0, c],
      [c, 0, x],
    ] as const
  )[Math.floor(h / 60) % 6];
  return {
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255,
    a: alpha,
  };
};

const relativeLuminance = ({ r, g, b }: Rgb): number => {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** WCAG 2.x contrast ratio, 1–21. */
export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (p, q) => q - p
  );
  return (x + 0.05) / (y + 0.05);
};

/*
 * The ink to put ON a filled colour: white unless white would drop below the
 * 3:1 UI-component threshold, in which case the app's dark ink.
 *
 * Deliberately NOT "whichever contrasts more". White on the brand orange is
 * 3.5:1 against the dark ink's 4.9:1, so maximising would flip every branded
 * button to dark text and diverge from the app's own palette. Preferring
 * white matches the design system while still protecting light brands: on the
 * amber (#f2a001) white manages only 2.1:1, so that falls through to ink.
 */
const contrastInk = (on: Rgb): string => {
  const white = { r: 255, g: 255, b: 255, a: 1 };
  return contrastRatio(on, white) >= 3 ? '#fff' : '#1c1c28';
};

// --- document shape ----------------------------------------------------

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Levenshtein, capped — only used to suggest a near-miss key. */
const editDistance = (a: string, b: string): number => {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        last + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      last = tmp;
    }
  }
  return prev[b.length];
};

const didYouMean = (key: string, candidates: string[]): string => {
  const best = candidates
    .map(c => ({ c, d: editDistance(key.toLowerCase(), c.toLowerCase()) }))
    .sort((x, y) => x.d - y.d)[0];
  return best && best.d <= Math.max(2, Math.floor(key.length / 3))
    ? ` Did you mean "${best.c}"?`
    : '';
};

// --- emission ----------------------------------------------------------

/** A token's resolved value for one mode, plus how it got there. */
type Declarations = Map<string, string>;

const anchorRef = (anchor: Anchor): string => ANCHOR_VALUE[anchor];

const emitRecipe = (
  recipe: Recipe,
  resolved: Map<Anchor, Rgb>
): string | undefined => {
  switch (recipe.kind) {
    case 'mix': {
      const pct = Math.round(recipe.p * 1000) / 10;
      return `color-mix(in srgb, ${anchorRef(recipe.a)} ${pct}%, ${anchorRef(recipe.b)})`;
    }
    case 'shade':
      // Relative colour syntax: keeps the hue, steps lightness and chroma.
      // Supported since Chromium 119, far under the enforced floor of 132
      // (scripts/check-min-browser.mjs).
      return `oklch(from ${anchorRef(recipe.from)} calc(l * ${recipe.l}) calc(c * ${recipe.c}) h)`;
    case 'ring':
      return `0 0 0 0.1875rem color-mix(in srgb, ${anchorRef(recipe.from)} ${recipe.alpha * 100}%, transparent)`;
    case 'gradient':
      return `linear-gradient(156deg, var(${recipe.from}) 4%, var(${recipe.to}) 96%)`;
    case 'contrast': {
      // The one recipe that needs real channels, so it only resolves when the
      // anchor's colour is known in this document.
      const on = resolved.get(recipe.from);
      return on ? contrastInk(on) : undefined;
    }
  }
};

const declarationsToCss = (selector: string, decls: Declarations): string => {
  if (decls.size === 0) return '';
  const body = [...decls]
    .map(([token, value]) => `  ${token}: ${value};`)
    .join('\n');
  return `${selector} {\n${body}\n}\n`;
};

// --- compile -----------------------------------------------------------

type BlockResult = {
  decls: Declarations;
  /** Roles the author actually mentioned in this block. */
  mentioned: Set<RoleName>;
};

/*
 * Compile one theme block (the roles for a single mode). Warnings are pushed
 * as they are found; anything unusable is skipped, never fatal.
 */
const compileBlock = (
  block: Json,
  mode: Mode,
  path: string,
  warnings: ThemeProblem[],
  only?: RoleName[]
): BlockResult => {
  const decls: Declarations = new Map();
  const mentioned = new Set<RoleName>();
  // Anchor colours known from THIS document, for the contrast recipes.
  const resolved = new Map<Anchor, Rgb>();
  const literal = new Map<string, string>();

  for (const [key, value] of Object.entries(block)) {
    if (key === 'tokens') continue; // handled by the caller (document level)
    // In the shorthand form the roles ARE the document, so the document-level
    // keys sit in the same object. `name` is a real one — don't report it as
    // an unrecognised role. (Inside a light/dark block it is unrecognised,
    // and `path` is what tells the two apart.)
    if (key === 'name' && path === '') continue;
    if (!ROLE_NAMES.includes(key as RoleName)) {
      warnings.push({
        path: `${path}.${key}`,
        message: `Unrecognised setting "${key}" — ignored.${didYouMean(key, [...ROLE_NAMES, 'tokens'])}`,
      });
      continue;
    }
    const role = key as RoleName;
    if (only && !only.includes(role)) continue;
    const spec = ROLES[role];

    // A bare colour string is shorthand for the role's primary member.
    const members: Json =
      typeof value === 'string'
        ? { [spec.shorthand]: value }
        : isObject(value)
          ? value
          : {};
    if (typeof value !== 'string' && !isObject(value)) {
      warnings.push({
        path: `${path}.${key}`,
        message: `"${key}" must be a colour or an object of settings — ignored.`,
      });
      continue;
    }
    if (typeof value === 'string' && !spec.shorthand) {
      warnings.push({
        path: `${path}.${key}`,
        message: `"${key}" takes named settings, not a single colour — ignored.`,
      });
      continue;
    }

    mentioned.add(role);

    for (const [member, raw] of Object.entries(members)) {
      const tokens = spec.members[member];
      if (!tokens) {
        warnings.push({
          path: `${path}.${key}.${member}`,
          message: `Unrecognised setting "${member}" — ignored.${didYouMean(member, Object.keys(spec.members))}`,
        });
        continue;
      }
      // `gradient` is the one member that isn't a plain colour.
      if (member === 'gradient') {
        const gradient = gradientValue(raw);
        if (!gradient) {
          warnings.push({
            path: `${path}.${key}.gradient`,
            message:
              'A gradient must be two colours, e.g. ["#ff8800", "#e63535"], or a CSS gradient — ignored.',
          });
          continue;
        }
        tokens.forEach(token => literal.set(token, gradient));
        continue;
      }
      if (typeof raw !== 'string') {
        warnings.push({
          path: `${path}.${key}.${member}`,
          message: `"${member}" must be a colour — ignored.`,
        });
        continue;
      }
      const colour = parseColour(raw);
      if (!colour) {
        warnings.push({
          path: `${path}.${key}.${member}`,
          message: `"${raw}" is not a colour this app can read — use a hex code like #0b6e99. Ignored.`,
        });
        continue;
      }
      tokens.forEach(token => literal.set(token, raw.trim()));
      // Remember the anchors the derived recipes need.
      if (role === 'brand' && member === 'base') resolved.set('brand', colour);
      if (role === 'accent' && member === 'base')
        resolved.set('accent', colour);
      if (role === 'danger' && member === 'base')
        resolved.set('danger', colour);
      if (role === 'surface' && member === 'page') resolved.set('page', colour);
      if (role === 'text' && member === 'body') resolved.set('body', colour);
      if (role === 'text' && member === 'muted') resolved.set('muted', colour);
    }
  }

  // `warning.alert` falls back to `warning.base`.
  if (literal.has('--color-warning') && !literal.has('--warning-main'))
    literal.set('--warning-main', literal.get('--color-warning')!);

  /*
   * The login hero's ink is picked against what the hero paints WHERE THE
   * TEXT SITS. A derived gradient is a ladder of the brand, so the brand
   * answers for it; an explicit gradient can be any two colours, and picking
   * against the brand would be picking against a surface that isn't there.
   *
   * The strapline sits at the BOTTOM of the hero (LoginInitLayout bottom-
   * aligns the panel) and the sweep runs top → bottom at 156deg, so the LAST
   * stop is the colour under the text — not the lightest one. The stock hero
   * shows why that distinction matters: its stops are #ff8800 → #e63535, and
   * near-white clears the red it actually sits on while failing against the
   * orange it never touches.
   */
  const heroStops = gradientStops(literal.get('--gradient-primary'));
  resolved.set(
    'hero',
    heroStops.at(-1) ?? resolved.get('brand') ?? STOCK_BRAND
  );

  // Emit each mentioned group: the derived tokens first, then the author's
  // literals on top (an explicit member always wins over its recipe).
  const groupTokens = new Set<string>();
  for (const role of mentioned) {
    ROLES[role].tokens.forEach(token => groupTokens.add(token));
    Object.values(ROLES[role].members)
      .flat()
      .forEach(token => groupTokens.add(token));
  }
  // The neutral roles form one family — see themeRecipes.NEUTRAL_FAMILY.
  if (['surface', 'text', 'border'].some(r => mentioned.has(r as RoleName)))
    NEUTRAL_FAMILY.forEach(token => groupTokens.add(token));

  for (const token of groupTokens) {
    const recipe = TOKEN_RECIPES[token]?.[mode];
    if (!recipe) continue;
    const value = emitRecipe(recipe, resolved);
    if (value !== undefined) decls.set(token, value);
  }
  for (const [token, value] of literal) decls.set(token, value);

  return { decls, mentioned };
};

/*
 * The colour stops of a gradient value, for the hero-ink contrast pick. Reads
 * both shapes we accept: the two-colour form we build ourselves, and a raw CSS
 * gradient an author wrote (where anything not hex/rgb/hsl is simply not found
 * — the pick then falls back to the brand, which is no worse than before).
 */
const gradientStops = (value: string | undefined): Rgb[] => {
  if (!value) return [];
  const matches = value.match(
    /#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)/g
  );
  return (matches ?? [])
    .map(parseColour)
    .filter((colour): colour is Rgb => colour !== undefined);
};

/** `["#a", "#b"]` or a raw CSS gradient string. */
const gradientValue = (raw: unknown): string | undefined => {
  if (typeof raw === 'string' && raw.includes('gradient(')) return raw.trim();
  if (
    Array.isArray(raw) &&
    raw.length === 2 &&
    raw.every(c => typeof c === 'string' && parseColour(c))
  )
    return `linear-gradient(156deg, ${raw[0]} 4%, ${raw[1]} 96%)`;
  return undefined;
};

/** Contrast pairs worth warning about, as [token, againstToken, minimum]. */
const CONTRAST_PAIRS: [string, string, number][] = [
  ['--text-body', '--bg-white', 4.5],
  ['--text-secondary', '--bg-white', 4.5],
  ['--text-body', '--bg-drawer', 4.5],
  // 3:1, the UI-component threshold, not 4.5 — the app's own palette sits at
  // 3.5:1 (white on the brand orange), and a warning that fires on the
  // default theme is noise that teaches people to ignore warnings.
  ['--primary-contrast', '--primary-main', 3],
  ['--primary-main', '--bg-white', 3],
  ['--secondary-main', '--bg-white', 3],
  ['--error-main', '--bg-white', 3],
];

const checkContrast = (
  decls: Declarations,
  mode: Mode,
  warnings: ThemeProblem[]
): void => {
  for (const [token, against, minimum] of CONTRAST_PAIRS) {
    // Only checkable when both sides are literal colours in this document —
    // a color-mix() expression has no value until the browser resolves it.
    const a = parseColour(decls.get(token) ?? '');
    const b = parseColour(decls.get(against) ?? '');
    if (!a || !b) continue;
    const ratio = contrastRatio(a, b);
    if (ratio < minimum)
      warnings.push({
        path: mode,
        message: `${token} on ${against} has a contrast ratio of ${ratio.toFixed(1)}:1, below the ${minimum}:1 needed for accessibility.`,
      });
  }
};

const compileTokensEscapeHatch = (
  raw: unknown,
  path: string,
  warnings: ThemeProblem[]
): Declarations => {
  const decls: Declarations = new Map();
  if (!isObject(raw)) {
    warnings.push({
      path,
      message: '"tokens" must be an object of token names to values — ignored.',
    });
    return decls;
  }
  for (const [token, value] of Object.entries(raw)) {
    if (!THEMABLE_TOKENS.has(token)) {
      warnings.push({
        path: `${path}.${token}`,
        message: `"${token}" is not a themable token — ignored.${didYouMean(token, [...THEMABLE_TOKENS])}`,
      });
      continue;
    }
    if (typeof value !== 'string') {
      warnings.push({
        path: `${path}.${token}`,
        message: `"${token}" must be a CSS value — ignored.`,
      });
      continue;
    }
    decls.set(token, value.trim());
  }
  return decls;
};

/*
 * The doubled `:root:root` is deliberate: it outranks both `:root` and
 * `:root[data-theme='dark']` in tokens.css whatever the stylesheet order
 * (Vite injects styles at dev time and HMR appends more), while keeping the
 * custom dark block ahead of the custom light block.
 */
const SELECTOR: Record<Mode, string> = {
  light: ':root:root',
  dark: ":root:root[data-theme='dark']",
};

export const compileTheme = (text: string): CompileResult => {
  const errors: ThemeProblem[] = [];
  const warnings: ThemeProblem[] = [];
  const empty = { css: '', errors, warnings };

  if (text.trim() === '') return empty;

  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    errors.push({ path: '', message: (e as Error).message });
    return empty;
  }
  if (!isObject(doc)) {
    errors.push({ path: '', message: 'A theme must be a JSON object.' });
    return empty;
  }

  const hasModeBlocks = 'light' in doc || 'dark' in doc;
  const topLevelRoles = Object.keys(doc).filter(k =>
    ROLE_NAMES.includes(k as RoleName)
  );
  if (hasModeBlocks && topLevelRoles.length > 0) {
    errors.push({
      path: '',
      message: `Put ${topLevelRoles.join(', ')} inside "light" or "dark" — a theme cannot mix top-level colours with light/dark blocks.`,
    });
    return empty;
  }

  // A document with no light/dark wrapper IS the light theme.
  const lightBlock = hasModeBlocks
    ? isObject(doc.light)
      ? doc.light
      : undefined
    : doc;
  const darkBlock = isObject(doc.dark) ? doc.dark : undefined;
  if (hasModeBlocks && 'light' in doc && !isObject(doc.light))
    warnings.push({
      path: 'light',
      message: '"light" must be an object — ignored.',
    });
  if ('dark' in doc && !isObject(doc.dark))
    warnings.push({
      path: 'dark',
      message: '"dark" must be an object — ignored.',
    });

  for (const key of Object.keys(doc)) {
    if (DOC_KEYS.includes(key)) continue;
    // Unknown top-level keys are warned about inside compileBlock for the
    // shorthand form; only flag them here when there ARE mode blocks.
    if (hasModeBlocks)
      warnings.push({
        path: key,
        message: `Unrecognised setting "${key}" — ignored.${didYouMean(key, DOC_KEYS)}`,
      });
  }

  const light = lightBlock
    ? compileBlock(lightBlock, 'light', hasModeBlocks ? 'light' : '', warnings)
    : undefined;
  // With no dark block, the hue roles carry into dark mode using the dark
  // recipes; the neutrals keep the stock dark values (a light page colour
  // would be unreadable there).
  const dark = darkBlock
    ? compileBlock(darkBlock, 'dark', 'dark', warnings)
    : lightBlock
      ? compileBlock(
          lightBlock,
          'dark',
          hasModeBlocks ? 'light' : '',
          [],
          HUE_ROLES
        )
      : undefined;

  const escapeHatch: Record<Mode, Declarations> = {
    light: new Map(),
    dark: new Map(),
  };
  if ('tokens' in doc && !hasModeBlocks)
    escapeHatch.light = compileTokensEscapeHatch(
      doc.tokens,
      'tokens',
      warnings
    );
  if (lightBlock && hasModeBlocks && 'tokens' in lightBlock)
    escapeHatch.light = compileTokensEscapeHatch(
      lightBlock.tokens,
      'light.tokens',
      warnings
    );
  if (darkBlock && 'tokens' in darkBlock)
    escapeHatch.dark = compileTokensEscapeHatch(
      darkBlock.tokens,
      'dark.tokens',
      warnings
    );

  const blocks: Record<Mode, Declarations> = {
    light: new Map([...(light?.decls ?? []), ...escapeHatch.light]),
    dark: new Map([...(dark?.decls ?? []), ...escapeHatch.dark]),
  };

  for (const mode of MODES) checkContrast(blocks[mode], mode, warnings);

  const css = MODES.map(mode =>
    declarationsToCss(SELECTOR[mode], blocks[mode])
  ).join('');

  if (css === '') {
    const looksLikeMui = MUI_KEYS.some(k => k in doc);
    errors.push({
      path: '',
      message: looksLikeMui
        ? 'This looks like a theme from the previous app version. It uses settings this app does not have — convert it first (see the custom theme documentation).'
        : 'Nothing in this theme was recognised, so it would change nothing. Check the setting names against the custom theme documentation.',
    });
    return { css: '', errors, warnings };
  }

  return { css, errors, warnings };
};
