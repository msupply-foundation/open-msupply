/*
 * Custom-colour hex entry rules (spec/settings/rules.md § The store editor ›
 * Preferences, SET-05.40): six hex digits, `#` optional on entry, committed
 * lowercase with a leading `#` — hex-for-hex the current app's ColorMenu, so
 * a colour entered in either app reads back identically in both.
 */

/** True for a six-digit hex colour, with or without the leading `#`. */
export const isValidHexColour = (hex: string): boolean =>
  /^#?[0-9a-f]{6}$/i.test(hex.trim());

/** The committed form: trimmed, `#`-prefixed, lowercase. Valid input only. */
export const normaliseHexColour = (hex: string): string => {
  const trimmed = hex.trim().toLowerCase();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
};
