import { describe, expect, it } from 'vitest';
import { parseDobSearch } from './dobSearch';

const DMY = 'dd/MM/yyyy';
const MDY = 'MM/dd/yyyy';
const YMD = 'yyyy-MM-dd';

describe('parseDobSearch', () => {
  it('is undefined for blank text', () => {
    expect(parseDobSearch('  ', DMY)).toBeUndefined();
  });

  it('reads a year as the whole year', () => {
    expect(parseDobSearch('1984', DMY)).toEqual({
      from: '1984-01-01',
      to: '1984-12-31',
      exact: false,
    });
  });

  it('reads a month and year as the whole month', () => {
    expect(parseDobSearch('3/1984', DMY)).toEqual({
      from: '1984-03-01',
      to: '1984-03-31',
      exact: false,
    });
    expect(parseDobSearch('02-2024', MDY)).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
      exact: false,
    });
    expect(parseDobSearch('1984-03', YMD)).toEqual({
      from: '1984-03-01',
      to: '1984-03-31',
      exact: false,
    });
  });

  it('reads a full date in the locale order', () => {
    const day = { from: '1984-03-14', to: '1984-03-14', exact: true };
    expect(parseDobSearch('14/03/1984', DMY)).toEqual(day);
    expect(parseDobSearch('03/14/1984', MDY)).toEqual(day);
    expect(parseDobSearch('1984-03-14', YMD)).toEqual(day);
  });

  it('refuses what is not a date', () => {
    for (const text of ['84', '13/1984', '31/02/1984', '1/2/84', 'abc', '1']) {
      expect(parseDobSearch(text, DMY)).toBe('invalid');
    }
  });
});
