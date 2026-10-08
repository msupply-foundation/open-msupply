import { describe, it, expect } from 'vitest';
import { locationsForItem, type StockLocation } from './stockLocations';
// Straight from the module, not the domain barrel: the barrel also exports the
// pickers, which drag Kobalte into this node-env test.
import {
  getVolumeUsedPercentage,
  availableVolume,
} from '../../domain/location/volume';

// The location-picker narrowing (spec/stock S2/S3 — the location lookup is
// restricted to the item's location type when one is set; `.43` has the server
// enforce IncorrectLocationType regardless), and the capacity fields the
// volume-aware picker reads off each node (`.56`).
//
// Anchors: spec/stock/cases/OMS-REG-INV-02.
//   .43 — a location of the wrong type is rejected for a restricted item;
//         the picker narrows client-side, the server enforces regardless
//   .56 — the placement field lists code, name and % used, and offers the
//         All / Empty / Available fullness filter

const loc = (over: Partial<StockLocation> & Pick<StockLocation, 'id'>) =>
  ({
    code: 'CODE',
    name: 'Name',
    onHold: false,
    volume: 100,
    volumeUsed: 0,
    stock: { __typename: 'StockLineConnector', totalCount: 0 },
    locationType: null,
    ...over,
  }) as StockLocation;

const LOCS: StockLocation[] = [
  loc({
    id: '1',
    code: 'COLD-1',
    name: 'Cold room 1',
    locationType: { id: 'cold', name: 'Cold' },
    volume: 200,
    volumeUsed: 50,
    stock: { __typename: 'StockLineConnector', totalCount: 3 },
  }),
  loc({
    id: '2',
    code: 'AMB-1',
    name: 'Ambient 1',
    locationType: { id: 'ambient', name: 'Ambient' },
  }),
  loc({ id: '3', code: 'NO-TYPE', name: 'Untyped' }),
];

describe('locationsForItem', () => {
  it('offers every location when the item is unrestricted', () => {
    expect(locationsForItem(LOCS, null).map(l => l.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });
  it("narrows to the item's location type when restricted", () => {
    expect(locationsForItem(LOCS, 'cold').map(l => l.id)).toEqual(['1']);
  });
  it('excludes untyped locations under a restriction', () => {
    expect(locationsForItem(LOCS, 'ambient').map(l => l.id)).toEqual(['2']);
  });

  // The regression this exists to catch (issue #380): the stock location fields
  // PLACE stock, so they take the volume-aware picker — which reads capacity
  // straight off the node. Projecting to { id, code, name } here would leave
  // the picker with no "% used" and a fullness filter with nothing to filter
  // on, and NOTHING would fail: the field still lists every location and still
  // saves. So the guard is on the shape, not on the widget.
  it('passes the capacity fields through untouched, so % used can be read', () => {
    const cold = locationsForItem(LOCS, 'cold')[0]!;
    expect(cold).toMatchObject({
      onHold: false,
      volume: 200,
      volumeUsed: 50,
      stock: { totalCount: 3 },
    });
    // 50 of 200 — the same figure the locations list's fullness column shows.
    expect(getVolumeUsedPercentage(cold)).toBe(25);
    expect(availableVolume(cold)).toBe(150);
  });

  it('keeps every offered node whole, not just the first', () => {
    for (const l of locationsForItem(LOCS, null)) {
      expect(typeof l.volume).toBe('number');
      expect(typeof l.volumeUsed).toBe('number');
      expect(typeof l.onHold).toBe('boolean');
      expect(typeof l.stock.totalCount).toBe('number');
    }
  });
});
