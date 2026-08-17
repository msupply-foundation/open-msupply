import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileTheme, contrastRatio, parseColour } from './customTheme';

/*
 * The load-bearing test is the FIDELITY ROUND-TRIP: compiling the documented
 * example theme (which is today's tokens.css written in the custom-theme
 * format) must reproduce today's tokens. That is what stops the recipe table
 * in themeRecipes.ts drifting from the design system it was fitted to.
 *
 * Doing it in node means evaluating the CSS we emit ourselves — the helpers
 * below are a reference implementation of the two functions we generate
 * (color-mix in srgb, and relative oklch), not app code.
 */

const TOKENS_CSS = 'src/ui/styles/tokens.css';
const EXAMPLE = 'src/ui/docs/custom_themes/system-theme.example.json';

// --- reference colour maths -------------------------------------------

type Rgb = [number, number, number];
const hex = (h: string): Rgb => {
  let d = h.replace('#', '').trim();
  if (d.length === 3) d = [...d].map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(d.slice(i, i + 2), 16)) as Rgb;
};
const toHex = (rgb: Rgb): string =>
  '#' +
  rgb
    .map(v =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('');
const channelDistance = (a: string, b: string): number =>
  Math.max(...hex(a).map((v, i) => Math.abs(v - hex(b)[i])));

const mixSrgb = (a: string, b: string, p: number): string =>
  toHex(hex(a).map((v, i) => v * p + hex(b)[i] * (1 - p)) as Rgb);

const lin = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const unlin = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
const toOklch = (h: string): Rgb => {
  const [r, g, b] = hex(h).map(v => lin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
};
const fromOklch = ([L, C, H]: Rgb): string => {
  const [A, B] = [C * Math.cos(H), C * Math.sin(H)];
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return toHex(
    [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map(v => unlin(Math.max(0, Math.min(1, v))) * 255) as Rgb
  );
};

// --- reading the two sources ------------------------------------------

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** Stock token values per mode, straight out of tokens.css. */
const stockTokens = (): Record<'light' | 'dark', Map<string, string>> => {
  const css = stripComments(readFileSync(TOKENS_CSS, 'utf8'));
  const read = (block: string) =>
    new Map(
      [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [
        m[1],
        m[2].trim(),
      ])
    );
  const root = /:root\s*\{([^}]*)\}/.exec(css);
  const darkBlock = /:root\[data-theme='dark'\]\s*\{([^}]*)\}/.exec(css);
  const light = read(root![1]);
  const dark = new Map([...light, ...read(darkBlock![1])]);
  return { light, dark };
};

/** Declarations we emitted, per mode, parsed back out of our own CSS. */
const emittedTokens = (
  css: string
): Record<'light' | 'dark', Map<string, string>> => {
  const block = (selector: string) => {
    const found = css.split(selector + ' {')[1]?.split('\n}')[0] ?? '';
    return new Map(
      [...found.matchAll(/(--[\w-]+):\s*(.+);/g)].map(m => [m[1], m[2].trim()])
    );
  };
  return {
    light: block(':root:root'),
    dark: block(":root:root[data-theme='dark']"),
  };
};

/*
 * Resolve one emitted value to a hex colour the way a browser would: expand
 * var() references (preferring what this theme emitted, else the stock value),
 * then evaluate color-mix / relative oklch.
 */
const resolve = (
  value: string,
  emitted: Map<string, string>,
  stock: Map<string, string>,
  depth = 0
): string | undefined => {
  if (depth > 6) return undefined;
  const text = value.trim();

  const varRef = /^var\((--[\w-]+)\)$/.exec(text);
  if (varRef) {
    const next = emitted.get(varRef[1]) ?? stock.get(varRef[1]);
    return next ? resolve(next, emitted, stock, depth + 1) : undefined;
  }

  const mix = /^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%,\s*(.+)\)$/.exec(text);
  if (mix) {
    const a = resolve(mix[1], emitted, stock, depth + 1);
    const b = resolve(mix[3], emitted, stock, depth + 1);
    return a && b ? mixSrgb(a, b, parseFloat(mix[2]) / 100) : undefined;
  }

  const shade =
    /^oklch\(from\s+(.+?)\s+calc\(l \* ([\d.]+)\)\s+calc\(c \* ([\d.]+)\)\s+h\)$/.exec(
      text
    );
  if (shade) {
    const base = resolve(shade[1], emitted, stock, depth + 1);
    if (!base) return undefined;
    const [L, C, H] = toOklch(base);
    return fromOklch([L * parseFloat(shade[2]), C * parseFloat(shade[3]), H]);
  }

  return /^#[0-9a-fA-F]{3,8}$/.test(text) ? text : undefined;
};

// --- the tests ---------------------------------------------------------

describe('fidelity: the example theme reproduces tokens.css', () => {
  const stock = stockTokens();
  const result = compileTheme(readFileSync(EXAMPLE, 'utf8'));
  const emitted = emittedTokens(result.css);

  /*
   * The hue ladders are looser by nature: one shared rule per (mode, variant)
   * serves both brand and accent, and the stock -light/-dark variants were
   * hand-picked rather than stepped. Everything else holds to 5/255.
   */
  const HUE_LADDER = new Set([
    '--primary-light',
    '--primary-dark',
    '--secondary-light',
    '--secondary-dark',
  ]);
  const tolerance = (token: string) => (HUE_LADDER.has(token) ? 9 : 5);

  it('compiles with no errors', () => {
    expect(result.errors).toEqual([]);
  });

  for (const mode of ['light', 'dark'] as const) {
    it(`reproduces every ${mode} token it emits`, () => {
      const drift: string[] = [];
      for (const [token, value] of emitted[mode]) {
        // Composite values (gradients, focus rings) aren't single colours;
        // they're asserted as strings below.
        if (value.includes('gradient(') || value.startsWith('0 0 0')) continue;
        const got = resolve(value, emitted[mode], stock[mode]);
        const want = stock[mode].get(token);
        expect(want, `${token} is not in tokens.css`).toBeDefined();
        if (!got) {
          drift.push(`${token}: could not resolve "${value}"`);
          continue;
        }
        const d = channelDistance(got, want!);
        if (d > tolerance(token))
          drift.push(`${token}: got ${got}, want ${want} (Δ${d})`);
      }
      expect(drift).toEqual([]);
    });
  }

  it('reproduces the two hero gradients exactly', () => {
    expect(emitted.light.get('--gradient-primary')).toBe(
      'linear-gradient(156deg, #ff8800 4%, #e63535 96%)'
    );
    expect(emitted.light.get('--gradient-secondary')).toBe(
      'linear-gradient(156deg, #78a3fc 4%, #3e7bfa 96%)'
    );
  });

  it('reproduces the focus rings exactly', () => {
    // The stock light ring IS the action blue at 25%.
    expect(emitted.light.get('--focus-ring')).toBe(
      '0 0 0 0.1875rem color-mix(in srgb, var(--secondary-main) 25%, transparent)'
    );
    expect(emitted.dark.get('--focus-ring')).toBe(
      '0 0 0 0.1875rem color-mix(in srgb, var(--secondary-main) 45%, transparent)'
    );
  });
});

describe('partial themes only touch what they mention', () => {
  it('emits brand tokens only for a one-line brand theme', () => {
    const { css, errors } = compileTheme('{ "brand": "#0b6e99" }');
    expect(errors).toEqual([]);
    const light = emittedTokens(css).light;
    expect([...light.keys()].sort()).toEqual([
      '--gradient-primary',
      // The hero strapline's ink is contrast-picked from the brand, so it
      // belongs to the brand group — see themeRecipes.ROLES.brand.
      '--login-hero-text',
      '--primary-contrast',
      '--primary-dark',
      '--primary-light',
      '--primary-main',
    ]);
    expect(light.get('--primary-main')).toBe('#0b6e99');
  });

  it('leaves the greys alone when only the hues change', () => {
    const { css } = compileTheme('{ "accent": "#0b6e99", "danger": "#900" }');
    // Asserted on the tokens SET, not the raw text: the accent-tinted
    // surfaces legitimately reference var(--bg-white) as an anchor without
    // redefining it.
    const light = emittedTokens(css).light;
    expect(light.has('--gray-main')).toBe(false);
    expect(light.has('--bg-white')).toBe(false);
    expect(light.has('--text-body')).toBe(false);
    expect(light.has('--bg-icon')).toBe(true);
  });

  it('moves the whole neutral family when the page colour changes', () => {
    // Surfaces, greys and borders share the page/muted anchors — changing the
    // page without them would leave light-theme greys on a dark page.
    const { css } = compileTheme('{ "surface": "#101a20" }');
    const light = emittedTokens(css).light;
    expect(light.get('--bg-white')).toBe('#101a20');
    expect(light.has('--gray-main')).toBe(true);
    expect(light.has('--color-divider')).toBe(true);
    expect(light.has('--bg-drawer')).toBe(true);
  });

  it('lets an explicit member win over its recipe', () => {
    const { css } = compileTheme(
      '{ "brand": { "base": "#0b6e99", "dark": "#012" } }'
    );
    expect(emittedTokens(css).light.get('--primary-dark')).toBe('#012');
  });
});

describe('a single-block theme in dark mode', () => {
  const { css } = compileTheme('{ "brand": "#0b6e99", "surface": "#ffffff" }');
  const { dark } = emittedTokens(css);

  it('carries the hue roles into dark mode', () => {
    expect(dark.get('--primary-main')).toBe('#0b6e99');
  });

  it('does not carry surfaces or ink into dark mode', () => {
    expect(dark.has('--bg-white')).toBe(false);
    expect(dark.has('--text-body')).toBe(false);
  });
});

describe('problems are reported without throwing away the rest', () => {
  it('refuses malformed JSON, reporting the parse error', () => {
    const { css, errors } = compileTheme('{ not json');
    expect(css).toBe('');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).not.toBe('');
  });

  it('refuses a document that mixes top-level roles with light/dark', () => {
    const { css, errors } = compileTheme(
      '{ "brand": "#0b6e99", "dark": { "brand": "#fff" } }'
    );
    expect(css).toBe('');
    expect(errors[0].message).toContain('inside "light" or "dark"');
  });

  it('refuses a document where nothing is recognised', () => {
    const { css, errors } = compileTheme('{ "primary": "#123456" }');
    expect(css).toBe('');
    expect(errors[0].message).toContain('Nothing in this theme was recognised');
  });

  it('names the previous app version when given a MUI theme', () => {
    const { css, errors } = compileTheme(
      '{ "palette": { "primary": { "main": "#123456" } } }'
    );
    expect(css).toBe('');
    expect(errors[0].message).toContain('previous app version');
  });

  it('accepts a name beside the roles in the shorthand form', () => {
    // `name` is a document-level key, and in the shorthand form it shares the
    // object with the roles — it must not read as an unrecognised role.
    const { errors, warnings } = compileTheme(
      '{ "name": "Ministry teal", "brand": "#00695c" }'
    );
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('warns and ignores an unknown key, keeping the rest', () => {
    const { css, errors, warnings } = compileTheme(
      '{ "brand": "#0b6e99", "brnad": "#fff" }'
    );
    expect(errors).toEqual([]);
    expect(css).toContain('--primary-main: #0b6e99');
    expect(warnings[0].message).toContain('Did you mean "brand"');
  });

  it('warns and skips a member it cannot read as a colour', () => {
    const { css, errors, warnings } = compileTheme(
      '{ "brand": { "base": "#0b6e99", "dark": "rebeccapurple" } }'
    );
    expect(errors).toEqual([]);
    expect(css).toContain('--primary-main: #0b6e99');
    expect(warnings[0].message).toContain('not a colour this app can read');
    // The skipped member falls back to its recipe rather than vanishing.
    expect(emittedTokens(css).light.get('--primary-dark')).toContain('oklch');
  });

  it('warns about a token the escape hatch may not name', () => {
    const { warnings } = compileTheme(
      '{ "brand": "#0b6e99", "tokens": { "--space-4": "2rem" } }'
    );
    expect(warnings[0].message).toContain('not a themable token');
  });

  it('accepts a themable token through the escape hatch', () => {
    const { css, errors } = compileTheme(
      '{ "tokens": { "--shadow-drawer": "none" } }'
    );
    expect(errors).toEqual([]);
    expect(css).toContain('--shadow-drawer: none');
  });

  it('warns when text fails contrast against its own surface', () => {
    const { errors, warnings } = compileTheme(
      '{ "surface": "#ffffff", "text": "#eeeeee" }'
    );
    expect(errors).toEqual([]);
    expect(warnings.some(w => w.message.includes('contrast ratio'))).toBe(true);
  });
});

describe('colour parsing', () => {
  it('reads the formats the format documents', () => {
    expect(parseColour('#fff')).toMatchObject({ r: 255, g: 255, b: 255 });
    expect(parseColour('#0b6e99')).toMatchObject({ r: 11, g: 110, b: 153 });
    expect(parseColour('rgb(11, 110, 153)')).toMatchObject({
      r: 11,
      g: 110,
      b: 153,
    });
    expect(parseColour('hsl(197, 87%, 32%)')?.b).toBeGreaterThan(140);
    expect(parseColour('rebeccapurple')).toBeUndefined();
    expect(parseColour('oklch(0.5 0.1 200)')).toBeUndefined();
  });

  it('computes WCAG contrast', () => {
    const white = parseColour('#fff')!;
    const black = parseColour('#000')!;
    expect(contrastRatio(white, black)).toBeCloseTo(21, 1);
  });
});

describe('the login hero ink follows the brand', () => {
  /*
   * The strapline sits on the brand gradient, so a pale brand must flip it to
   * dark ink. Without this the hero keeps near-white text on a pale hero.
   */
  it('stays white on a dark brand', () => {
    const { css } = compileTheme('{ "brand": "#0b6e99" }');
    expect(emittedTokens(css).light.get('--login-hero-text')).toBe('#fff');
  });

  it('flips to dark ink on a pale brand', () => {
    const { css } = compileTheme('{ "brand": "#f2a001" }');
    expect(emittedTokens(css).light.get('--login-hero-text')).toBe('#1c1c28');
  });

  it('picks against an explicit gradient, not the brand', () => {
    /*
     * The hero paints the gradient, so when one is given the brand is no
     * longer the surface under the strapline. Bottom-aligned text on a
     * top→bottom sweep sits on the LAST stop: a pale brand with a deep
     * gradient still wants white ink, and vice versa.
     */
    const paleBrandDeepHero = compileTheme(
      '{ "brand": { "base": "#8b8bf5", "gradient": ["#6d28d9", "#1e1b4b"] } }'
    );
    expect(
      emittedTokens(paleBrandDeepHero.css).light.get('--login-hero-text')
    ).toBe('#fff');

    const deepBrandPaleHero = compileTheme(
      '{ "brand": { "base": "#0b6e99", "gradient": ["#0b6e99", "#fcd34d"] } }'
    );
    expect(
      emittedTokens(deepBrandPaleHero.css).light.get('--login-hero-text')
    ).toBe('#1c1c28');
  });

  it('can still be pinned explicitly', () => {
    const { css } = compileTheme(
      '{ "brand": "#f2a001", "text": { "onGradient": "#ffffff" } }'
    );
    expect(emittedTokens(css).light.get('--login-hero-text')).toBe('#ffffff');
  });
});
