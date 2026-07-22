import { describe, it, expect } from 'vitest';
import { locationsForItem, type StockLocation } from './stockLocations';

// The location-picker narrowing (spec/stock S2/S3 — the location lookup is
// restricted to the item's location type when one is set; AC-E4 has the server
// enforce IncorrectLocationType regardless).

const LOCS: StockLocation[] = [
  {
    id: '1',
    code: 'COLD-1',
    name: 'Cold room 1',
    locationType: { id: 'cold' },
  },
  {
    id: '2',
    code: 'AMB-1',
    name: 'Ambient 1',
    locationType: { id: 'ambient' },
  },
  { id: '3', code: 'NO-TYPE', name: 'Untyped', locationType: null },
];

describe('locationsForItem', () => {
  it('offers every location, code+name only, when the item is unrestricted', () => {
    const result = locationsForItem(LOCS, null);
    expect(result).toEqual([
      { id: '1', code: 'COLD-1', name: 'Cold room 1' },
      { id: '2', code: 'AMB-1', name: 'Ambient 1' },
      { id: '3', code: 'NO-TYPE', name: 'Untyped' },
    ]);
  });
  it("narrows to the item's location type when restricted", () => {
    const result = locationsForItem(LOCS, 'cold');
    expect(result.map(l => l.id)).toEqual(['1']);
  });
  it('excludes untyped locations under a restriction', () => {
    expect(locationsForItem(LOCS, 'ambient').map(l => l.id)).toEqual(['2']);
  });
});
