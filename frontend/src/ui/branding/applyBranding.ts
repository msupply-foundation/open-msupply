/*
 * The DOM half of site branding: put a compiled custom theme on the page, and
 * hold the custom logo for AppLogo to render. The compiler (customTheme.ts) is
 * pure and knows nothing about any of this.
 *
 * Both values are cached in localStorage under their server hash, so:
 *  - the pre-paint script in index.html can apply the theme before first
 *    paint (no flash of the stock orange on a branded site), and
 *  - a boot that can't reach the server still shows the site's branding.
 *
 * Storage is best-effort throughout (private mode can throw on write); a
 * failed cache costs a flash on the next load, never the theme itself.
 */
import { createSignal } from 'solid-js';
import { compileTheme } from './customTheme';

/** Shared with the pre-paint script in index.html / showcase.html. */
const THEME_CSS_KEY = 'oms-custom-theme-css';
const THEME_HASH_KEY = 'oms-custom-theme-hash';
const LOGO_KEY = 'oms-custom-logo';
const LOGO_HASH_KEY = 'oms-custom-logo-hash';
const STYLE_ID = 'oms-custom-theme';

const read = (key: string): string => {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
};

const write = (key: string, value: string): void => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // storage unavailable — branding still applies for this session
  }
};

// --- theme -------------------------------------------------------------

/*
 * The style element is appended LAST in <head> and its rules are written with
 * a doubled :root (see customTheme.ts), so neither stylesheet order nor a
 * dev-server HMR insertion can outrank it.
 */
const applyThemeCss = (css: string): void => {
  const existing = document.getElementById(STYLE_ID);
  if (!css) {
    existing?.remove();
    return;
  }
  const style = existing ?? document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  if (!existing) document.head.append(style);
};

/** The hash of the theme we hold, for the server's did-this-change check. */
export const cachedThemeHash = (): string => read(THEME_HASH_KEY);

/*
 * Apply and cache a theme document straight from the server. Compile problems
 * are not surfaced here — this path is a mirror of what an admin already
 * saved, and the Settings editor is where problems get reported. A document
 * that no longer compiles simply leaves the app on the stock theme.
 */
export const applyCustomTheme = (value: string, hash: string): void => {
  const css = value ? compileTheme(value).css : '';
  applyThemeCss(css);
  write(THEME_CSS_KEY, css);
  // Keep the server's hash even when the theme is empty (a cleared theme is
  // stored as an empty value with a hash of its own), so the next boot can
  // say "unchanged" instead of re-clearing every time.
  write(THEME_HASH_KEY, hash);
};

/** Drop the custom theme in place — no reload (Settings' toggle-off path). */
export const clearCustomTheme = (): void => {
  applyThemeCss('');
  write(THEME_CSS_KEY, '');
  write(THEME_HASH_KEY, '');
};

// --- logo --------------------------------------------------------------

/*
 * Reduce a saved logo document to an <svg> element that is safe to inline.
 *
 * The value is Server-Admin-authored, but it applies BEFORE login (the login
 * hero shows it), so it is worth hardening: scripts, embedded HTML and
 * external references all go. The reference app inlines the SVG with no
 * sanitising at all; nothing legitimate is lost by this pass.
 */
export const sanitiseSvg = (source: string): string | undefined => {
  if (!source.trim()) return undefined;
  let svg: SVGElement | null = null;
  try {
    const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
    if (parsed.querySelector('parsererror')) return undefined;
    svg =
      parsed.documentElement.tagName.toLowerCase() === 'svg'
        ? (parsed.documentElement as unknown as SVGElement)
        : parsed.querySelector('svg');
  } catch {
    return undefined;
  }
  if (!svg) return undefined;

  svg.querySelectorAll('script, foreignObject').forEach(el => el.remove());
  svg.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const isReference = name === 'href' || name.endsWith(':href');
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      // Same-document references (#gradient-id) are how SVGs point at their
      // own defs; anything else would reach off the page.
      else if (isReference && !attr.value.trim().startsWith('#'))
        el.removeAttribute(attr.name);
    }
  });
  // The wrapper sizes the logo, so a document-level width/height would fight
  // it (the stock logo scales the same way).
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  return svg.outerHTML;
};

/*
 * The site's custom logo, sanitised and ready to inline — undefined when the
 * site has none, which is when AppLogo falls back to the mSupply guy. Seeded
 * from the cache at module load so a branded site's login screen doesn't
 * flash the stock logo while the server round-trip is in flight.
 */
const [customLogo, setCustomLogoSignal] = createSignal<string | undefined>(
  sanitiseSvg(read(LOGO_KEY))
);

export { customLogo };

export const cachedLogoHash = (): string => read(LOGO_HASH_KEY);

export const applyCustomLogo = (value: string, hash: string): void => {
  const svg = value ? sanitiseSvg(value) : undefined;
  setCustomLogoSignal(svg);
  // Cache the ORIGINAL: sanitising is cheap and the rules may tighten.
  write(LOGO_KEY, svg ? value : '');
  write(LOGO_HASH_KEY, hash);
};

export const clearCustomLogo = (): void => {
  setCustomLogoSignal(undefined);
  write(LOGO_KEY, '');
  write(LOGO_HASH_KEY, '');
};
