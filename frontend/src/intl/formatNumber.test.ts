import { describe, expect, it } from 'vitest';
import { formatNumber, parseNumber, intlNumberFormat } from './formatNumber';

describe('formatNumber', () => {
  it('formats with the explicit locale override', () => {
    expect(formatNumber(1234.5, { locale: 'en' })).toBe('1,234.5');
    expect(formatNumber(1234.5, { locale: 'fr' })).toContain('234'); // fr groups with a space
  });

  it('renders Arabic-Indic digits for ar', () => {
    const out = intlNumberFormat('ar', {}).format(123);
    expect(out).toMatch(/[٠-٩]/); // contains Arabic-Indic digits
  });

  it('renders extended-Arabic digits for Dari and Pashto', () => {
    // ICU pins `ps` to Latin digits, so both format through fa-AF
    // (LOCALE_META) — the assertion that keeps that override honest.
    expect(intlNumberFormat('prs', {}).format(123)).toMatch(/[۰-۹]/);
    expect(intlNumberFormat('ps', {}).format(123)).toMatch(/[۰-۹]/);
  });

  it('returns empty string for nullish', () => {
    expect(formatNumber(undefined, { locale: 'en' })).toBe('');
    expect(formatNumber(null, { locale: 'en' })).toBe('');
  });

  it('raises max fraction digits to min when needed', () => {
    expect(
      formatNumber(1, {
        locale: 'en',
        minimumFractionDigits: 2,
        maximumFractionDigits: 0,
      })
    ).toBe('1.00');
  });
});

// Constructing an Intl.NumberFormat is expensive enough to dominate a long
// list's render (see the comment on formatCache), so the reuse is a behaviour
// worth holding: these break if a refactor reintroduces per-call construction.
describe('intlNumberFormat caching', () => {
  it('reuses one formatter for the same locale and options', () => {
    expect(intlNumberFormat('en', { maximumFractionDigits: 2 })).toBe(
      intlNumberFormat('en', { maximumFractionDigits: 2 })
    );
    expect(intlNumberFormat('en')).toBe(intlNumberFormat('en'));
  });

  it('reuses one formatter regardless of the option key order', () => {
    expect(
      intlNumberFormat('en', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      })
    ).toBe(
      intlNumberFormat('en', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 1,
      })
    );
  });

  it('treats an explicitly-undefined option as absent, as Intl does', () => {
    expect(intlNumberFormat('en', { minimumFractionDigits: undefined })).toBe(
      intlNumberFormat('en', {})
    );
  });

  it('keeps formatters for different locales and options apart', () => {
    const en = intlNumberFormat('en', { maximumFractionDigits: 2 });
    expect(en).not.toBe(intlNumberFormat('fr', { maximumFractionDigits: 2 }));
    expect(en).not.toBe(intlNumberFormat('en', { maximumFractionDigits: 3 }));
    // The distinction that matters most: a collision here would render
    // currency as a bare number.
    expect(en).not.toBe(
      intlNumberFormat('en', {
        maximumFractionDigits: 2,
        style: 'currency',
        currency: 'NZD',
      })
    );
  });

  it('still formats correctly through a reused formatter', () => {
    // Guards the stateless-`.format()` assumption the cache rests on.
    const format = intlNumberFormat('en', { maximumFractionDigits: 2 });
    expect(format.format(1234.567)).toBe('1,234.57');
    expect(format.format(0)).toBe('0');
    expect(format.format(-1.5)).toBe('-1.5');
    expect(format.format(1234.567)).toBe('1,234.57');
  });
});

describe('parseNumber', () => {
  it('parses Latin-digit strings with grouping', () => {
    expect(parseNumber('1,234.5')).toBe(1234.5);
    expect(parseNumber('-42')).toBe(-42);
  });

  it('parses Arabic-Indic digits back to a Number', () => {
    expect(parseNumber('١٢٣')).toBe(123);
  });

  it('parses extended-Arabic digits back to a Number', () => {
    // What Dari/Pashto number fields hand back — a different code block from
    // the Arabic-Indic set above.
    expect(parseNumber('۱۲۳')).toBe(123);
  });

  it('returns NaN for empty input', () => {
    expect(Number.isNaN(parseNumber(''))).toBe(true);
  });
});
