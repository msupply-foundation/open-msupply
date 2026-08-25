// The pure fullness maths behind ProportionCell (registry role "proportion cell
// (fullness bar)"): a proportion expressed as a PERCENTAGE of its capacity →
// the fill's width and its tone, or `undefined` when there is no proportion to
// show at all. Split out of the component so the rules that are invisible when
// wrong — a real 0 renders an empty bar, an absent proportion renders NOTHING —
// are unit-testable (proportionFill.test.ts).

/**
 * How the fill reads against the capacity: at or below it, nearing it, past it.
 * Semantic (never colour-named — src/ui/CLAUDE.md principle 5); the CSS maps
 * each to palette tokens, and the cell states the tone in text as well.
 */
export type ProportionTone = 'normal' | 'near' | 'over';

export interface ProportionFill {
  /** The proportion as a percentage — UNCLAMPED, so it may exceed 100. */
  percentage: number;
  /** The fill's inline size as a percentage of the track (clamped to 100). */
  width: number;
  tone: ProportionTone;
}

// Reference-app parity: the current app's locations list switches its
// InlineProgress colour at >100 (error) and >80 (warning).
const NEAR_CAPACITY = 80;
const AT_CAPACITY = 100;

export const proportionFill = (
  percentage: number | null | undefined
): ProportionFill | undefined => {
  // No proportion to show → blank (ui-standards § tables, absent values: a
  // figure that is undefined rather than zero must not substitute 0). A
  // capacity of `0` has nothing to be a proportion of, and dividing by it
  // yields Infinity or NaN, so the non-finite guard IS the blank-when-capacity-
  // is-0 rule; a negative proportion is not a reading either.
  if (percentage == null || !Number.isFinite(percentage) || percentage < 0)
    return undefined;
  return {
    percentage,
    // Over capacity the track is full — the overflow is carried by the figure
    // and the tone, not by a fill wider than its own track.
    width: Math.min(percentage, AT_CAPACITY),
    tone:
      percentage > AT_CAPACITY
        ? 'over'
        : percentage > NEAR_CAPACITY
          ? 'near'
          : 'normal',
  };
};
