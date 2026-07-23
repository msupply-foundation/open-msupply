import { describe, expect, it } from 'vitest';
import {
  csvEscape,
  masterListsToCsv,
  type MasterListExportRow,
} from './masterListExport';

const ROWS: MasterListExportRow[] = [
  { id: 'm1', code: 'ML01', name: 'Essential meds', description: 'core list' },
  { id: 'm2', code: 'ML02', name: 'Cold chain, vaccines', description: '' },
];
const HEADERS = { code: 'Code', name: 'Name', description: 'Description' };

describe('masterListExport (spec/master-lists § export)', () => {
  // AC-E1 — export covers exactly the loaded rows (current page only); columns
  // are the literal `id` then the translated Code/Name/Description.
  it('AC-E1: CSV = literal id header + translated headers + the loaded rows', () => {
    const csv = masterListsToCsv(ROWS, HEADERS);
    expect(csv.split('\n')[0]).toBe('id,Code,Name,Description');
    expect(csv).toContain('m1,ML01,Essential meds,core list');
    // a value with a comma is quoted
    expect(csv).toContain('m2,ML02,"Cold chain, vaccines",');
    // exactly the two loaded rows (+ header)
    expect(csv.split('\n')).toHaveLength(3);
  });

  // AC-E3 — no rows loaded → no data to export (header-only; the screen shows
  // "No data available" rather than downloading).
  it('AC-E3: empty rows produce a header-only document', () => {
    expect(masterListsToCsv([], HEADERS)).toBe('id,Code,Name,Description');
  });

  it('csvEscape quotes commas/quotes/newlines and doubles interior quotes', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('a"b')).toBe('"a""b"');
    expect(csvEscape('a\nb')).toBe('"a\nb"');
  });
});
