import { createSignal } from 'solid-js';

/*
 * The installation's decimal places for displayed numbers — the one signal
 * formatNumber's DEFAULT and the numberDisplay helpers both read (spec/
 * ui-standards/tables.md § display rounding). Its own module so neither of
 * those imports the other.
 */

// The most decimal places any formatter emits — also what "the exact value"
// means for display (numberDisplay.ts): binary floats carry dust past this
// (0.1 + 0.2 = 0.30000000000000004), and showing that as the "full" figure
// would misstate what was entered.
export const MAX_FRACTION_DIGITS = 10;

/** The mark a rounded figure carries beside its hover text (spec § display
 *  rounding). Punctuation, not translated. */
export const ROUNDED_MARK = '*';

/** The default until the store's preference lands — also the server's. */
export const DEFAULT_DECIMAL_PLACES = 2;

/*
 * Seeded with the default and set from the entered store's context, exactly
 * as homeCurrency is (currency.ts): the formatters are plain functions reached
 * from every vertical, so the value cannot live in a component or a screen's
 * query. Wired by StoreGuardLayout's context effect.
 */
const [decimalPlaces, setSignal] = createSignal(DEFAULT_DECIMAL_PLACES);
export { decimalPlaces };

export const setDecimalPlaces = (places: number | null | undefined): void => {
  setSignal(
    typeof places === 'number' && Number.isInteger(places) && places >= 0
      ? Math.min(places, MAX_FRACTION_DIGITS)
      : DEFAULT_DECIMAL_PLACES
  );
};
