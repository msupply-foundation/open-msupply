/*
 * The bottom bar's custom store colour (spec/chrome § bottom bar): the store's
 * custom-colour preference applied as the footer's background, with text
 * picked for contrast. Pure logic — AppShell applies the result inline (a
 * DATA colour on a record, like ColourTagDot's --tag-colour, not a theme
 * value).
 *
 * Only a parseable hex colour applies (#rgb or #rrggbb — the preference's own
 * label asks for a hex code); anything else leaves the bar's default, which
 * matches the reference app's effective behaviour (its contrast derivation
 * throws on non-hex values and the failure is swallowed).
 */

/** The inline colours for a custom-coloured footer, or undefined to keep the
 *  bar's default styling. */
export const footerColourStyle = (
  value: string | undefined
): { background: string; text: string } | undefined => {
  const rgb = parseHexColour(value);
  if (!rgb) return undefined;
  // WCAG relative luminance, then white text where it holds ≥3:1 contrast
  // against the background, dark text otherwise (the reference app's
  // getContrastText threshold).
  const [r, g, b] = rgb.map(channel => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  return {
    background: `#${rgb.map(c => c.toString(16).padStart(2, '0')).join('')}`,
    text: contrastWithWhite >= 3 ? '#ffffff' : '#000000',
  };
};

/** #rgb / #rrggbb → [r, g, b] (0–255), or undefined when not a hex colour. */
const parseHexColour = (
  value: string | undefined
): [number, number, number] | undefined => {
  const hex = value?.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (!hex) return undefined;
  const full =
    hex.length === 3 ? [...hex].map(digit => digit + digit).join('') : hex;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
};
