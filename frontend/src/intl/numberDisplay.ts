import { formatNumber } from './formatNumber';
import {
  DEFAULT_DECIMAL_PLACES,
  MAX_FRACTION_DIGITS,
  ROUNDED_MARK,
  decimalPlaces,
  setDecimalPlaces,
} from './decimalPlaces';

export {
  DEFAULT_DECIMAL_PLACES,
  ROUNDED_MARK,
  decimalPlaces,
  setDecimalPlaces,
};

/*
 * Display rounding for numbers, and how a rounded figure declares itself
 * (spec/ui-standards/tables.md § display rounding).
 *
 * Every number the app SHOWS keeps the installation's configured decimal
 * places; the stored value is never touched, and what a field ACCEPTS is its
 * own rule, not this one. A figure that lost digits to the rounding takes a
 * visible mark and carries its exact value as hover text; one showing its
 * whole value takes neither, so the mark keeps meaning something.
 *
 * Money is NOT here: it follows its own currency's minor units
 * (intl/currency), a per-currency fact rather than an installation preference.
 */

/*
 * Decimal places a VOLUME shows, fixed rather than configured. A volume in
 * cubic metres runs orders of magnitude smaller than a count does — 0.0035 m³
 * a vial — so the configured places would render most of them as 0. Exempt by
 * magnitude, as money is by currency (spec § display rounding).
 */
export const VOLUME_DECIMALS = 5;

// The value at `places`, unmarked — the text a rounded figure is built from.
const plainText = (value: number, places: number, pad: boolean): string =>
  formatNumber(value, {
    minimumFractionDigits: pad ? places : undefined,
    maximumFractionDigits: places,
  });

/*
 * The value in full — the hover text's figure. Capped at MAX_FRACTION_DIGITS so
 * binary-float dust never surfaces: a stored 0.30000000000000004 reads "0.3",
 * which is what the user typed.
 */
export const exactText = (value: number, minimumFractionDigits = 0): string =>
  formatNumber(value, {
    minimumFractionDigits,
    maximumFractionDigits: MAX_FRACTION_DIGITS,
  });

/*
 * Whether displaying `value` at `places` actually loses something. Decided on
 * the FORMATTED strings rather than by comparing numbers: that is the question
 * the user can see ("does the cell show me everything?"), and it absorbs float
 * dust for free — comparing `value` to its rounded self would flag 0.1 + 0.2 as
 * truncated and offer "0.30000000000000004" as the truth. A padded figure is
 * compared against the exact value padded the same way, so 2.50 for 2.5 is
 * not called a rounding.
 */
export const isRounded = (
  value: number,
  places = decimalPlaces(),
  pad = false
): boolean =>
  plainText(value, places, pad) !== exactText(value, pad ? places : 0);

/**
 * A number ready to render: the text to show — marked when rounding lost
 * something — and the exact value to hover when, and only when, it did.
 */
export type DisplayedNumber = { text: string; exact?: string };

/** `pad` fills the fraction to `places` (2.50) — a headline figure in a band,
 *  where an even width reads better than an unpadded one. */
export const displayNumber = (
  value: number,
  places = decimalPlaces(),
  pad = false
): DisplayedNumber => {
  const text = plainText(value, places, pad);
  return isRounded(value, places, pad)
    ? { text: `${text}${ROUNDED_MARK}`, exact: exactText(value) }
    : { text };
};

/** The value as shown — rounded to `places` and marked when that lost digits —
 *  for a figure with no element to hang hover text on (a chart axis tick, a
 *  legend, a figure inside a sentence). */
export const roundedText = (value: number, places = decimalPlaces()): string =>
  displayNumber(value, places).text;

/** A volume ready to render, at the places a volume keeps — the one formatter
 *  for every m³ figure in the app. */
export const displayVolume = (value: number): DisplayedNumber =>
  displayNumber(value, VOLUME_DECIMALS);

/**
 * A total, shown rounded: either the values to add (summed here at FULL
 * precision) or a figure already summed at full precision elsewhere — a server
 * aggregate over a whole document. Marked and hovered like any other figure,
 * which is what lets a column of rounded parts that doesn't visibly add up to
 * it explain itself.
 *
 * Summing the rounded parts instead would make the total agree with the column
 * on screen while disagreeing with the data, which is the worse lie.
 */
export const displayTotal = (
  total: number | readonly number[],
  places = decimalPlaces()
): DisplayedNumber =>
  displayNumber(
    typeof total === 'number'
      ? total
      : total.reduce((sum, part) => sum + part, 0),
    places
  );
