import { describe, expect, it } from 'vitest';
import {
  listExportCsvFilename,
  listExportExcelFilename,
  sanitizeForFilename,
} from './exportFilenames';

// Shared list-export filenames (spec/ui-standards/list-views.md § regions):
// raw ISO instant, sanitized store code, list name, underscore-joined.

describe('list-export filenames', () => {
  const now = new Date('2026-07-23T02:40:21.429Z');

  it('names the CSV <instant>_<store code>_<list name>.csv with the raw ISO instant', () => {
    expect(listExportCsvFilename('GHOG', 'locations', now)).toBe(
      '2026-07-23T02:40:21.429Z_GHOG_locations.csv'
    );
  });

  it('sanitizes the store code but leaves the list name alone', () => {
    expect(listExportCsvFilename('G<H*O?G:', 'stocktakes', now)).toBe(
      '2026-07-23T02:40:21.429Z_GHOG_stocktakes.csv'
    );
  });

  it('names the Excel conversion request <store code>_<list name>, store code raw', () => {
    expect(listExportExcelFilename('GHOG', 'stock')).toBe('GHOG_stock');
  });

  it('sanitizeForFilename strips path/reserved and control characters', () => {
    expect(sanitizeForFilename('a<b>c:d"e/f\\g|h?i*j\x00k')).toBe(
      'abcdefghijk'
    );
  });
});
