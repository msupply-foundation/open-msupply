/*
 * The collapse contract shared by <Button> and <SplitButton> (ui-standards
 * #btn-icons): which width tier a labelled control sheds its label at, written
 * as the `data-collapsible` attribute value both components' CSS matches.
 *
 * Its own module rather than a const on Button.tsx: SplitButton has to honour
 * the same app-wide default, and importing it from Button would pull Button
 * (and its stylesheet) into every chunk that has a split button.
 */

/**
 * How far down a control collapses:
 *   true     — phone widths (≤767px).
 *   'narrow' — the whole narrow-viewport range (≤1023px, breakpoints
 *              .navOverlay). For a page header whose action cluster would
 *              otherwise wrap onto a row of its own on a tablet.
 */
export type Collapsible = boolean | 'narrow';

/*
 * Whether a labelled control sheds its label on phone widths WITHOUT an
 * explicit `collapsible` prop. Off for now — collapsing is opt-in per control.
 * This is the single switch to make collapse the app-wide default later: flip
 * it to `true` and every labelled button collapses on phones unless it passes
 * `collapsible={false}`.
 */
export const COLLAPSIBLE_BY_DEFAULT = false;

/**
 * The tier as the data attribute's value: `''` for the phone tier, `'narrow'`
 * for the wider one, `undefined` for a control that doesn't collapse. The CSS
 * matches the BARE attribute for the phone tier and the value for the narrow
 * one, so `'narrow'` collapses at both widths.
 */
export const collapseTier = (
  collapsible: Collapsible | undefined
): string | undefined => {
  const tier = collapsible ?? COLLAPSIBLE_BY_DEFAULT;
  if (tier === 'narrow') return 'narrow';
  return tier ? '' : undefined;
};
