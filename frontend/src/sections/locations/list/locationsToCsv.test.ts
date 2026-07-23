import { describe, expect, it } from 'vitest';
import { locationsToCsv } from './locationsToCsv';
import type { LocationRow } from './locationEdit';

// AC-L5 — CSV export (spec/locations/acceptance.md § list & lifecycle): a CSV
// with each location's code, name, location type, volume, volume-used, and
// on-hold, formatted for OMS consumer compatibility (#377): type name only,
// lowercase true/false, timestamp-and-store-code filename. In node the catalog
// isn't loaded, so t() falls back to its keys — header assertions pin keys
// standing in for the translated labels; the data-value assertions are exact
// because AC-L5 pins them as machine formats, not translations.

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

describe('AC-L5 — CSV export', () => {
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
      'false',
    ]);
  });

  it('serializes on-hold as lowercase true/false and carries every row', () => {
    const csv = locationsToCsv([
      row(),
      row({ id: 'loc-2', code: 'B2', name: 'Shelf B', onHold: true }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1].split(',')[5]).toBe('false');
    expect(lines[2].split(',')[5]).toBe('true');
  });

  it('exports the location type name only — no temperature range', () => {
    const csv = locationsToCsv([
      row({
        locationType: {
          id: 'lt-1',
          name: 'Freezer',
          minTemperature: -20,
          maxTemperature: -16,
        },
      }),
    ]);
    expect(csv.split('\r\n')[1].split(',')[2]).toBe('Freezer');
  });
});
