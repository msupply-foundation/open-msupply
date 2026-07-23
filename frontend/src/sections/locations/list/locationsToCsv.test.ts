import { describe, expect, it } from 'vitest';
import { locationsToCsv } from './locationsToCsv';
import type { LocationRow } from './locationEdit';

// OMS-REG-INV-01.11 — CSV export (spec/locations/acceptance.md § list & lifecycle): a CSV
// with each location's code, name, location type, volume, volume-used, and
// on-hold. In node the catalog isn't loaded, so t() falls back to its keys —
// the assertions pin structure and row values, with header keys standing in
// for the translated labels.

const row = (overrides: Partial<LocationRow> = {}): LocationRow => ({
  id: 'loc-1',
  code: 'A1',
  name: 'Aisle A',
  onHold: false,
  volume: 10,
  volumeUsed: 2.5,
  stock: { __typename: 'StockLineConnector', totalCount: 1 },
  locationType: null,
  ...overrides,
});

describe('OMS-REG-INV-01.11 — CSV export', () => {
  it('emits one header and one line per location, with the six spec columns in order', () => {
    const csv = locationsToCsv([row()]);
    const [header, line] = csv.split('\r\n');
    expect(header.split(',')).toEqual([
      'label.code',
      'label.name',
      'label.location-type',
      'label.volume',
      'label.volume-used',
      'label.on-hold',
    ]);
    expect(line.split(',')).toEqual([
      'A1',
      'Aisle A',
      '', // no type
      '10',
      '2.5',
      'messages.no',
    ]);
  });

  it('renders on-hold as the yes marker and carries every row', () => {
    const csv = locationsToCsv([
      row(),
      row({ id: 'loc-2', code: 'B2', name: 'Shelf B', onHold: true }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[2].split(',')[5]).toBe('messages.yes');
  });
});
