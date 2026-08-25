import type { JSX } from 'solid-js';
import type { ColumnMeta } from '@tanstack/solid-table';

// The card field-width arithmetic, pure and cell-free so it is unit-testable
// (the same move visibleOnCard made): CardView reads each column's
// meta.cardWidth / meta.cardSpan and hands the values here. The model these
// functions implement — ranges by content type, the group ceiling, the
// wrapping narrow fallback — is documented at
// src/ui/docs/CARD_TABLE_MODEL.md § Field widths.

/** One column's declared width (`ColumnMeta.cardWidth`), as CardView reads it. */
export type CardWidth = NonNullable<ColumnMeta<unknown, unknown>['cardWidth']>;

// One column's grid TRACK. A number is a fixed `rem` track — a formatted scalar
// whose longest value is known. `{ min, weight }` is `minmax(<min>rem,
// <weight>fr)`: an `fr` is one share of the space left over once every fixed
// track and gap is paid for, so the weighted fields split the remainder in
// their declared ratio (ux-testing/header-field-width.html § weighted columns).
// An undeclared column falls back to a 1fr share off a readable floor.
export const cardTrack = (width: CardWidth | undefined): string => {
  if (width === undefined) return 'minmax(10rem, 1fr)';
  return typeof width === 'number'
    ? `${width}rem`
    : `minmax(${width.min}rem, ${width.weight}fr)`;
};

// The same declaration expressed for the NARROW fallback, where the row wraps.
// An explicit grid template cannot wrap, so below the group's minima the fields
// reflow as a wrapping flex row instead — and this hands each one its declared
// size to wrap WITH, rather than throwing the declaration away and splitting the
// row evenly. That even split is what made a card in portrait wrong in both
// directions at once: a read-only Pack size held a full track it had no use for
// while Location's "code — name" value truncated beside it.
//
// THE SAME MODEL AS <FormRowItem> (ui/layout/Form, kdd/form-layout), whose
// weight / minWidth / maxWidth are this meta's weight / min / max — a wrapping
// weighted row was solved there first, for the prescriptions header, and the two
// should not drift. Its technique, adopted here:
//
//   - `flex: <weight> 1 0` — basis ZERO, the floor carried in `min-inline-size`.
//     That is what makes a weight a true `fr`: the row's whole width distributes
//     in proportion, rather than only the leftovers after every item has taken a
//     basis. Flexbox's min-violation pass then clamps each floor exactly as
//     `minmax()` does in the declared template, so both modes agree.
//   - The floor capped at `100%`, so a lone field on a line narrower than its
//     own floor shrinks instead of overflowing the card.
//   - Weight 0 pins a FIXED scalar (a quantity, a date) to its floor and hands
//     every spare pixel to its siblings: it has a known longest value, so extra
//     width is waste. A row of nothing but pinned fields therefore does not fill
//     — the slack is trailing space, which is the same bargain the group's own
//     ceiling strikes at full width.
//   - `max` applied PER FIELD, which the grid could not do: there, capping a
//     field inside its own track left the track's leftover as a hole mid-row, so
//     `max` had to become a whole-group ceiling. A wrapping flex row has no fixed
//     tracks, so a capped field simply stops and the slack passes on. Without it
//     a lone weighted field on a wrapped row stretches that whole line — the
//     failure FormRowItem's own `maxWidth` note describes.
export const cardFlex = (
  width: CardWidth | undefined,
  // The span is read only by the 'columns' narrow layout, which ignores the
  // sizing here — but it rides along so one style object carries everything a
  // field tells its group about its own width.
  declaredSpan: number | undefined
): JSX.CSSProperties | undefined => {
  const span = declaredSpan
    ? { '--card-field-span': `${declaredSpan}` }
    : undefined;
  if (width === undefined) return span;
  return typeof width === 'number'
    ? {
        '--card-field-weight': '0',
        '--card-field-floor': `${width}rem`,
        ...span,
      }
    : {
        '--card-field-weight': `${width.weight}`,
        '--card-field-floor': `${width.min}rem`,
        // Free text declares no ceiling and gets none — left unset, so the
        // field inherits the `none` the group declares.
        ...(width.max === undefined
          ? undefined
          : { '--card-field-max-w': `${width.max}rem` }),
        ...span,
      };
};

// The width, in rem, below which this group's declared template cannot fit —
// every track's minimum plus the 1rem column gaps between them. An explicit
// grid does not wrap, so below this the row would overflow its card; the flow
// falls back to the wrapping flex row instead (see FieldFlow).
export const cardTracksMinRem = (widths: (CardWidth | undefined)[]): number =>
  widths.reduce<number>((total, width) => {
    const min =
      width === undefined ? 10 : typeof width === 'number' ? width : width.min;
    return total + min;
  }, 0) + Math.max(0, widths.length - 1);

// The MEASURE a card's field block is held to, whatever the card is given.
// Mirrors --measure-wide in tokens.css ("~1280px — wide dashboards / dense
// forms"); duplicated as a number because the clamp below is arithmetic, not a
// cascade.
//
// It CAN wrap a group that a wider surface would have carried on fewer lines —
// a group whose floors sum past the measure has no single-line width left to
// it (the inbound pricing group's floors plus gaps come to ~106rem). That wrap
// is the constraint doing its job, not a defect:
// a form should be constrained rather than stretched across a wide viewport
// (ui-standards § Form & detail layout), and a block held near its content's
// width also wraps into FULLER lines: less slack to distribute means less
// variation between one line's right edge and the next, which is the jaggedness
// a wrapping row otherwise trades for its widths.
export const MEASURE_WIDE_REM = 80;

// The width past which this group stops growing — every fixed track at its
// size, every weighted track at its declared max, plus the gaps. Beyond it the
// extra space is not distributed at all; the row simply ends and the remainder
// is trailing space.
//
// A GROUP-level ceiling, not a per-field one. Capping each field inside its own
// `fr` track left the track's remainder as a hole in the MIDDLE of the row —
// Location stopping at its max while its track kept growing put a visible gap
// between it and Manufacturer. Capping the grid keeps every track proportional
// and moves the slack to the end, where it reads as margin.
//
// `undefined` when any column declares no width or no ceiling: its track is an
// open-ended sink, so the group has no meaningful ceiling of its own.
export const cardTracksMaxRem = (
  widths: (CardWidth | undefined)[]
): number | undefined => {
  let total = 0;
  for (const width of widths) {
    if (width === undefined) return undefined;
    if (typeof width === 'number') total += width;
    else if (width.max === undefined) return undefined;
    else total += width.max;
  }
  return total + Math.max(0, widths.length - 1);
};

// The value `--card-field-max` gets: the group's own ceiling, held to the
// measure. An uncapped group (free text) has no ceiling of its own — it still
// takes the measure, which is what stops a note running the full width of a
// very wide modal.
export const cardFieldMaxRem = (widths: (CardWidth | undefined)[]): number =>
  Math.min(cardTracksMaxRem(widths) ?? Infinity, MEASURE_WIDE_REM);
