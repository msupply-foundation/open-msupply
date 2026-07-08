import { itemRemainingStock } from './coverageMath';
import { BatchEntry } from '../draft';
import { ItemWithBatches } from './useVaccineBatchData';

// Non-vaccine item with two batches of 2 (doses=1, packSize=1 → packs == units)
// = 4 on hand in total.
const item2x2 = (): ItemWithBatches => ({
  id: 'item-x',
  name: 'Item X',
  code: 'X',
  unitName: 'tablet',
  doses: 1,
  isVaccine: false,
  batches: [
    {
      id: 'a',
      batch: 'A',
      expiryDate: null,
      availableNumberOfPacks: 2,
      totalNumberOfPacks: 2,
      packSize: 1,
    },
    {
      id: 'b',
      batch: 'B',
      expiryDate: null,
      availableNumberOfPacks: 2,
      totalNumberOfPacks: 2,
      packSize: 1,
    },
  ],
});

const entry = (over: Partial<BatchEntry>): BatchEntry => ({
  issued: 0,
  openVialWastageDoses: 0,
  wasted: 0,
  hasOpenVialWastage: false,
  ...over,
});

describe('itemRemainingStock', () => {
  it('is total on hand minus issued across all batches', () => {
    expect(itemRemainingStock(item2x2(), { a: entry({ issued: 1 }) })).toBe(3);
  });

  it('is zero when issued exactly equals the item total', () => {
    expect(itemRemainingStock(item2x2(), { a: entry({ issued: 4 }) })).toBe(0);
  });

  it('goes negative when over-issued against the item total (issue #83)', () => {
    // 5 typed on one 2-stock batch, item total is 4 → -1.
    expect(itemRemainingStock(item2x2(), { a: entry({ issued: 5 }) })).toBe(-1);
  });

  it('counts wastage against the total as well', () => {
    expect(
      itemRemainingStock(item2x2(), { a: entry({ issued: 2, wasted: 3 }) })
    ).toBe(-1);
  });
});
