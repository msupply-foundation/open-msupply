import { describe, expect, it } from 'vitest';
import {
  canImport,
  findHeaderRow,
  hasErrors,
  hasWarnings,
  isCsvFileName,
  parseImportDate,
  parseImportNumber,
} from './csvImport';

describe('isCsvFileName', () => {
  it('judges by the extension, whatever its case or padding', () => {
    expect(isCsvFileName('lines.csv')).toBe(true);
    expect(isCsvFileName(' LINES.CSV ')).toBe(true);
    expect(isCsvFileName('lines.xlsx')).toBe(false);
    expect(isCsvFileName('csv')).toBe(false);
  });
});

describe('findHeaderRow', () => {
  const known = ['Code', 'Pack size'];

  it('finds the first row naming a known column, under a banner', () => {
    expect(findHeaderRow([['code', 'pack size']], known)).toBe(0);
    expect(findHeaderRow([['My export'], [''], ['Code', 'Other']], known)).toBe(
      2
    );
  });

  it('scans only the first few rows and refuses a file with no heading', () => {
    const banner = Array.from({ length: 5 }, () => ['x']);
    expect(findHeaderRow([...banner, ['Code']], known)).toBe(-1);
    expect(findHeaderRow([...banner, ['Code']], known, 10)).toBe(5);
    expect(findHeaderRow([['a', 'b']], known)).toBe(-1);
  });
});

describe('parseImportNumber', () => {
  it('reads dots and lone commas as the decimal mark', () => {
    expect(parseImportNumber('12.5')).toBe(12.5);
    expect(parseImportNumber('12,5')).toBe(12.5);
    expect(parseImportNumber(' 1 000 ')).toBe(1000);
  });

  it('reads a grouped comma as thousands only in a comma-separated file', () => {
    expect(parseImportNumber('1,234')).toBe(1234);
    expect(parseImportNumber('1,234', true)).toBe(1.234);
    expect(parseImportNumber('12,345,678')).toBe(12345678);
  });

  it('takes the last mark as the decimal where both appear', () => {
    expect(parseImportNumber('1.234,56')).toBe(1234.56);
    expect(parseImportNumber('1,234.56')).toBe(1234.56);
  });

  it('reads nothing from a blank or non-numeric cell', () => {
    expect(parseImportNumber('')).toBeUndefined();
    expect(parseImportNumber('ten')).toBeUndefined();
    expect(parseImportNumber('12a')).toBeUndefined();
  });
});

describe('parseImportDate', () => {
  it('reads day-first with any of the three separators, and ISO', () => {
    expect(parseImportDate('05/10/2026')).toBe('2026-10-05');
    expect(parseImportDate('05-10-2026')).toBe('2026-10-05');
    expect(parseImportDate('05.10.2026')).toBe('2026-10-05');
    expect(parseImportDate('2026-10-05')).toBe('2026-10-05');
    expect(parseImportDate('2026/1/5')).toBe('2026-01-05');
  });

  it('refuses a two-digit year, an impossible day and a non-date', () => {
    expect(parseImportDate('05/10/24')).toBeNull();
    expect(parseImportDate('31/02/2024')).toBeNull();
    expect(parseImportDate('13/13/2024')).toBeNull();
    expect(parseImportDate('soon')).toBeNull();
    expect(parseImportDate('')).toBeNull();
  });
});

describe('the run predicates', () => {
  const clean = { errors: [], warnings: [] };
  const warned = { errors: [], warnings: ['dropped'] };
  const failed = { errors: ['bad'], warnings: [] };

  it('any error blocks the import; warnings do not', () => {
    expect(hasErrors([clean, failed])).toBe(true);
    expect(hasErrors([clean, warned])).toBe(false);
    expect(hasWarnings([clean, warned])).toBe(true);
    expect(canImport([clean, warned])).toBe(true);
    expect(canImport([clean, failed])).toBe(false);
  });

  it('an empty file imports nothing', () => {
    expect(canImport([])).toBe(false);
  });
});
