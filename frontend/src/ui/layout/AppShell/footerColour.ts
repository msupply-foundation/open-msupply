/*
 * The bottom bar's custom store colour (spec/chrome § bottom bar): the store's
 * custom-colour preference applied as the footer's background, with text
 * picked for contrast. Pure logic — AppShell exposes the result as the
 * footer's custom properties (a DATA colour on a record, like ColourTagDot's
 * --tag-colour, not a theme value).
 *
 * Only a parseable hex colour applies (#rgb or #rrggbb — the preference's own
 * label asks for a hex code); anything else leaves the bar's default, which
 * matches the reference app's effective behaviour (its contrast derivation
 * throws on non-hex values and the failure is swallowed). The parsing and
 * WCAG contrast maths are the branding module's — one engine, not a second
 * copy that drifts.
 */

import { contrastRatio, parseColour } from '../../branding/customTheme';

const WHITE = { r: 255, g: 255, b: 255, a: 1 };

/** The colours for a custom-coloured footer, or undefined to keep the bar's
 *  default styling. White text where it holds ≥3:1 contrast against the
 *  background, else black — the reference app's getContrastText choice (the
 *  branding module's own ink is the theme's dark, not applicable here). */
export const footerColourStyle = (
  value: string | undefined
): { background: string; text: string } | undefined => {
  // The hex-only gate — parseColour itself would also take rgb()/hsl(),
  // which the reference app rejects.
  const hex = value?.trim().match(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i)?.[0];
  const rgb = hex ? parseColour(hex) : undefined;
  if (!rgb) return undefined;
  return {
    // Re-serialised so #F00 lands as #ff0000.
    background: `#${[rgb.r, rgb.g, rgb.b]
      .map(channel => channel.toString(16).padStart(2, '0'))
      .join('')}`,
    text: contrastRatio(rgb, WHITE) >= 3 ? '#ffffff' : '#000000',
  };
};
