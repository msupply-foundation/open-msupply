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

  it('returns NaN for empty input', () => {
    expect(Number.isNaN(parseNumber(''))).toBe(true);
  });
});
