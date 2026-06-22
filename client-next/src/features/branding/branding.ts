/**
 * Runtime, server-distributed branding (the legacy "custom theme/logo" feature).
 *
 * The legacy client recreated a whole MUI theme object from a free-form partial
 * `ThemeOptions` JSON. client-next instead applies a **curated set of brand
 * tokens** as CSS custom properties on `:root` — no theme rebuild, the cascade
 * does the work. A back-compat reader pulls the brand-relevant values out of any
 * legacy free-form JSON still stored on a server.
 *
 * The server contract is unchanged: `displaySettings({ logo, theme })` (hashes)
 * returns customTheme/customLogo (value + hash) only when the hash changed.
 */

/** The curated, overridable brand tokens → CSS variable names. */
const TOKEN_TO_CSS_VAR: Record<string, string> = {
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--info', // legacy "secondary" is the blue accent → our --info
  error: '--destructive',
  info: '--info',
  success: '--success',
  warning: '--warning',
};

export interface BrandingTokens {
  primary?: string;
  primaryForeground?: string;
  secondary?: string;
  error?: string;
  info?: string;
  success?: string;
  warning?: string;
}

const LS = {
  theme: 'oms-next:branding:theme',
  themeHash: 'oms-next:branding:theme-hash',
  logo: 'oms-next:branding:logo',
  logoHash: 'oms-next:branding:logo-hash',
} as const;

const isHex = (v: unknown): v is string =>
  typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());

/**
 * Parse a stored customTheme JSON string into curated tokens. Accepts both the
 * new flat shape (`{ primary: '#…' }`) and the legacy free-form MUI
 * `ThemeOptions` shape (`{ palette: { primary: { main: '#…' } } }`).
 */
export function parseBrandingTokens(themeJson: string): BrandingTokens {
  if (!themeJson) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(themeJson);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object') return {};
  const obj = parsed as Record<string, unknown>;

  // Legacy MUI ThemeOptions shape.
  const palette = obj.palette as Record<string, unknown> | undefined;
  if (palette) {
    const main = (key: string): string | undefined => {
      const slot = palette[key] as Record<string, unknown> | undefined;
      return isHex(slot?.main) ? (slot!.main as string) : undefined;
    };
    return clean({
      primary: main('primary'),
      secondary: main('secondary'),
      error: main('error'),
      info: main('info'),
      success: main('success'),
      warning: main('warning'),
    });
  }

  // New flat curated shape.
  return clean({
    primary: pick(obj, 'primary'),
    primaryForeground: pick(obj, 'primaryForeground'),
    secondary: pick(obj, 'secondary'),
    error: pick(obj, 'error'),
    info: pick(obj, 'info'),
    success: pick(obj, 'success'),
    warning: pick(obj, 'warning'),
  });
}

const pick = (obj: Record<string, unknown>, key: string): string | undefined =>
  isHex(obj[key]) ? (obj[key] as string) : undefined;

const clean = (t: BrandingTokens): BrandingTokens =>
  Object.fromEntries(
    Object.entries(t).filter(([, v]) => v !== undefined),
  ) as BrandingTokens;

/** Apply curated tokens to `:root` as CSS custom properties. */
export function applyBrandingTokens(tokens: BrandingTokens): void {
  const root = document.documentElement;
  for (const [token, value] of Object.entries(tokens)) {
    const cssVar = TOKEN_TO_CSS_VAR[token];
    if (cssVar && value) root.style.setProperty(cssVar, value);
  }
}

/** Apply branding cached from a previous session immediately (no FOUC). */
export function applyCachedBranding(): void {
  const themeJson = localStorage.getItem(LS.theme);
  if (themeJson) applyBrandingTokens(parseBrandingTokens(themeJson));
}

export const brandingHashes = () => ({
  theme: localStorage.getItem(LS.themeHash) ?? '',
  logo: localStorage.getItem(LS.logoHash) ?? '',
});

/** Persist + apply a freshly-fetched theme/logo (value + hash) from the server. */
export function storeBranding(opts: {
  theme?: { value: string; hash: string } | null;
  logo?: { value: string; hash: string } | null;
}): void {
  if (opts.theme) {
    localStorage.setItem(LS.theme, opts.theme.value);
    localStorage.setItem(LS.themeHash, opts.theme.hash);
    applyBrandingTokens(parseBrandingTokens(opts.theme.value));
  }
  if (opts.logo) {
    localStorage.setItem(LS.logo, opts.logo.value);
    localStorage.setItem(LS.logoHash, opts.logo.hash);
  }
}

export const getCachedLogo = (): string | null => localStorage.getItem(LS.logo);
