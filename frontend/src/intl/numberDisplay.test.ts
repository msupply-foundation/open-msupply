import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DECIMAL_PLACES,
  ROUNDED_MARK,
  VOLUME_DECIMALS,
  decimalPlaces,
  displayNumber,
  displayTotal,
  displayVolume,
  exactText,
  isRounded,
  roundedText,
  setDecimalPlaces,
} from './numberDisplay';

// Display rounding for numbers (spec/ui-standards/tables.md § display rounding,
// fed by the global decimalPlacesForNumbers preference). The module holds a
// signal, so every case restores the default.
afterEach(() => setDecimalPlaces(DEFAULT_DECIMAL_PLACES));

describe('the configured decimal places', () => {
  it('defaults to 2 — the server default, used until the store context lands', () => {
    expect(decimalPlaces()).toBe(DEFAULT_DECIMAL_PLACES);
    expect(DEFAULT_DECIMAL_PLACES).toBe(2);
  });

  it('takes a configured whole number, zero included', () => {
    setDecimalPlaces(5);
    expect(decimalPlaces()).toBe(5);
    setDecimalPlaces(0);
    expect(decimalPlaces()).toBe(0);
  });

  it('falls back to the default for an unset or nonsensical value', () => {
    for (const bad of [null, undefined, -1, 1.5, NaN]) {
      setDecimalPlaces(5);
      setDecimalPlaces(bad);
      expect(decimalPlaces()).toBe(DEFAULT_DECIMAL_PLACES);
    }
  });

  it('caps at the formatter’s maximum rather than throwing', () => {
    setDecimalPlaces(999);
    expect(decimalPlaces()).toBe(10);
  });
});

describe('rounded and exact text', () => {
  it('rounds to the configured places, groups digits, and marks what it dropped', () => {
    expect(roundedText(1234.5678)).toBe('1,234.57*');
    expect(roundedText(1234.5)).toBe('1,234.5');
    setDecimalPlaces(0);
    expect(roundedText(1234.5678)).toBe('1,235*');
  });

  it('shows the exact value without binary-float dust', () => {
    expect(exactText(0.1 + 0.2)).toBe('0.3');
    expect(exactText(1234.5678)).toBe('1,234.5678');
  });
});

describe('whether a figure is rounded', () => {
  it('is rounded when digits are lost, not when the display shows the whole value', () => {
    expect(isRounded(1.234)).toBe(true);
    expect(isRounded(1.2)).toBe(false);
    expect(isRounded(7)).toBe(false);
  });

  it('does not call float dust a rounding — the user typed 0.3', () => {
    expect(isRounded(0.1 + 0.2)).toBe(false);
  });

  it('follows the configured places', () => {
    setDecimalPlaces(4);
    expect(isRounded(1.234)).toBe(false);
    setDecimalPlaces(1);
    expect(isRounded(1.234)).toBe(true);
  });
});

describe('a displayed number', () => {
  it('offers no hover text when nothing was lost', () => {
    expect(displayNumber(1.2)).toEqual({ text: '1.2' });
  });

  it('takes the mark and the exact value when rounding lost digits', () => {
    expect(displayNumber(1.2349)).toEqual({
      text: `1.23${ROUNDED_MARK}`,
      exact: '1.2349',
    });
  });

  it('pads to the places when asked, without calling the padding a rounding', () => {
    expect(displayNumber(2.5, 2, true)).toEqual({ text: '2.50' });
    expect(displayNumber(2.4999, 2, true)).toEqual({
      text: '2.50*',
      exact: '2.4999',
    });
    expect(displayNumber(2.5, 0, true)).toEqual({ text: '3*', exact: '2.5' });
  });
});

describe('a displayed volume', () => {
  it('keeps five decimals whatever the configured places', () => {
    expect(VOLUME_DECIMALS).toBe(5);
    setDecimalPlaces(0);
    expect(displayVolume(0.0035)).toEqual({ text: '0.0035' });
  });

  it('hovers the exact value past five decimals — the 7 dp m³ case', () => {
    expect(displayVolume(0.0000035)).toEqual({
      text: '0*',
      exact: '0.0000035',
    });
  });
});

describe('a displayed total', () => {
  it('sums at full precision, not the rounded parts', () => {
    // Rounded parts would give 0.33 × 3 = 0.99; the data says 1.
    expect(displayTotal([0.334, 0.333, 0.333]).text).toBe('1');
  });

  it('marks the total only when the shown figure differs from the full value', () => {
    // Exact at 2 dp: no mark, even though the displayed parts (0.33 each) do
    // not visibly add up to it.
    expect(displayTotal([0.334, 0.333, 0.333])).toEqual({ text: '1' });
    // Rounded: mark + the exact figure to hover.
    expect(displayTotal([0.335, 0.333, 0.333])).toEqual({
      text: `1${ROUNDED_MARK}`,
      exact: '1.001',
    });
  });

  it('takes an already-summed figure the same way — a server aggregate', () => {
    expect(displayTotal(1.001)).toEqual({ text: '1*', exact: '1.001' });
    expect(displayTotal(12)).toEqual({ text: '12' });
  });

  it('totals nothing as zero', () => {
    expect(displayTotal([])).toEqual({ text: '0' });
  });

  it('follows the configured places', () => {
    setDecimalPlaces(3);
    expect(displayTotal([0.335, 0.333, 0.333])).toEqual({ text: '1.001' });
  });
});
