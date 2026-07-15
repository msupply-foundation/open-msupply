// rem ↔ px conversion against the LIVE root font-size. The root font-size isn't fixed —
// index.css sets it to 100% (16px) normally but 85% (~13.6px) on compact — so `1rem` in
// px depends on the viewport, and we must read it at runtime rather than assume 16. We
// store column sizes in rem (so they scale with the root like everything else, per the
// rem-not-px sizing rule) while TanStack and resize handles work in px; these bridge that
// boundary. (rootFontSizePx is also the basis for future virtualisation row-height math.)

/** The current root font-size in px (what `1rem` currently equals). Reads the live value. */
export const rootFontSizePx = (): number =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/** px → rem, rounded to 2dp (avoids long floats in stored/displayed values). */
export const pxToRem = (px: number): number =>
  Math.round((px / rootFontSizePx()) * 100) / 100;

/** rem → px, rounded to a whole pixel (what TanStack column sizing expects). */
export const remToPx = (rem: number): number =>
  Math.round(rem * rootFontSizePx());
