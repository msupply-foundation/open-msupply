import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  getCurrencyInfo,
  setHomeCurrency,
  homeCurrency,
} from './currency';

describe('getCurrencyInfo', () => {
  it('derives minor units from Intl (the old hand-table drifted: KMF is 0)', () => {
    expect(getCurrencyInfo('USD', 'en').decimals).toBe(2);
    expect(getCurrencyInfo('JPY', 'en').decimals).toBe(0);
    expect(getCurrencyInfo('XOF', 'en').decimals).toBe(0);
    expect(getCurrencyInfo('KMF', 'en').decimals).toBe(0);
    expect(getCurrencyInfo('CDF', 'en').decimals).toBe(2);
  });

  it('places the symbol per locale', () => {
    expect(getCurrencyInfo('USD', 'en')).toEqual({
      symbol: '$',
      side: 'start',
      decimals: 2,
    });
    const eurInFr = getCurrencyInfo('EUR', 'fr');
    expect(eurInFr.symbol).toBe('€');
    expect(eurInFr.side).toBe('end');
  });

  it('honours the display style', () => {
    expect(getCurrencyInfo('USD', 'en', 'code').symbol).toBe('USD');
    // narrowSymbol collapses regional prefixes ("NZ$" → "$").
    expect(getCurrencyInfo('NZD', 'en', 'narrowSymbol').symbol).toBe('$');
    expect(getCurrencyInfo('NZD', 'en', 'symbol').symbol).toBe('NZ$');
  });

  it('falls back to a self-labelling code for invalid input', () => {
    expect(getCurrencyInfo('NOPE!', 'en')).toEqual({
      symbol: 'NOPE!',
      side: 'start',
      decimals: 2,
    });
  });
});

describe('homeCurrency', () => {
  it('seeds USD and normalises empty back to it', () => {
    expect(homeCurrency()).toBe('USD');
    setHomeCurrency('PGK');
    expect(homeCurrency()).toBe('PGK');
    setHomeCurrency(null);
    expect(homeCurrency()).toBe('USD');
  });
});

describe('formatCurrency', () => {
  it("formats at the currency's minor units with its narrow symbol", () => {
    expect(formatCurrency(1234.5, 'EUR')).toBe('€1,234.50');
    expect(formatCurrency(1234.5, 'JPY')).toBe('¥1,235');
  });

  it('falls back to the home currency when none is given', () => {
    setHomeCurrency('USD');
    expect(formatCurrency(2, null)).toBe('$2.00');
    expect(formatCurrency(2)).toBe('$2.00');
  });
});
