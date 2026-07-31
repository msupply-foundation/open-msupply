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
