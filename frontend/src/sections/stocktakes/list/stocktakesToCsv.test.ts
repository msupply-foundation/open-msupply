import { describe, expect, it } from 'vitest';
import { stocktakesToCsv } from './stocktakesToCsv';
import type { StocktakesResult } from './stocktakes.generated';

type StocktakeRow = StocktakesResult['stocktakes']['nodes'][number];

// Anchors: spec/stocktakes/cases/OMS-REG-INV-05.
//   .19 — Export downloads a CSV containing the listed stocktakes' details
//   .2  — a stocktake's displayed values match its stored record (the export is
//         the machine-readable projection of exactly those list columns)
// The download plumbing (blob / Excel conversion) is out of scope for a unit;
// here we pin the row → CSV projection. In node the catalog isn't loaded, so
// t() falls back to its keys — header/label assertions pin keys standing in for
// the translated labels; the data cells are exact.

const row = (over: Partial<StocktakeRow> = {}): StocktakeRow => ({
  id: 'st-1',
  stocktakeNumber: 7,
  status: 'NEW',
  description: 'Weekly count',
  comment: 'aisle A',
  createdDatetime: '2026-07-15T09:00:00.000Z',
  stocktakeDate: '2026-07-15',
  finalisedDatetime: null,
  isLocked: false,
  ...over,
});

describe('OMS-REG-INV-05.19 — stocktakes list CSV export', () => {
  it('emits one header row plus one line per stocktake, columns in list order', () => {
    const csv = stocktakesToCsv([row()]);
    const [header, ...lines] = csv.split('\r\n');
    expect(header.split(',')).toEqual([
      'label.number',
      'label.status',
      'label.description',
      'label.comment',
      'label.created',
      'label.stocktake-date',
      'label.locked',
    ]);
    expect(lines).toHaveLength(1);
    const cells = lines[0]!.split(',');
    expect(cells[0]).toBe('7'); // number
    expect(cells[1]).toBe('status.new'); // status label
    expect(cells[2]).toBe('Weekly count'); // description
    expect(cells[3]).toBe('aisle A'); // comment
    expect(cells[6]).toBe('messages.no'); // locked → No
  });

  it('renders every listed stocktake, preserving order', () => {
    const csv = stocktakesToCsv([
      row({ id: 'a', stocktakeNumber: 1 }),
      row({ id: 'b', stocktakeNumber: 2 }),
      row({ id: 'c', stocktakeNumber: 3 }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(4); // header + 3
    expect(lines.slice(1).map(l => l.split(',')[0])).toEqual(['1', '2', '3']);
  });

  it('projects status and locked flag from the record (OMS-REG-INV-05.2)', () => {
    const csv = stocktakesToCsv([row({ status: 'FINALISED', isLocked: true })]);
    const cells = csv.split('\r\n')[1]!.split(',');
    expect(cells[1]).toBe('status.finalised');
    expect(cells[6]).toBe('messages.yes');
  });

  it('leaves a blank stocktake-date cell when the record has none', () => {
    const csv = stocktakesToCsv([row({ stocktakeDate: null })]);
    // Header index 5 is stocktake-date; an RFC-4180 empty cell is the empty
    // string between its surrounding commas.
    const cells = csv.split('\r\n')[1]!.split(',');
    expect(cells[5]).toBe('');
  });
});
