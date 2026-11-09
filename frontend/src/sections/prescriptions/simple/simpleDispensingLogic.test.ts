import { describe, expect, it } from 'vitest';
import {
  availableUnits,
  buildCards,
  stockState,
  type CardItem,
} from './simpleDispensingLogic';

const item = (
  id: string,
  batches: { availableNumberOfPacks: number; packSize: number }[] = []
): CardItem => ({
  id,
  name: `Item ${id}`,
  unitName: 'Tablet',
  availableBatches: {
    __typename: 'StockLineConnector',
    nodes: batches.map((batch, i) => ({ id: `${id}-${i}`, ...batch })),
  },
});

describe('buildCards', () => {
  it('OMS-REG-DIS-12.4: one card per common medicine, in the order the store set them', () => {
    const cards = buildCards(
      [
        { itemId: 'b', amounts: [10] },
        { itemId: 'a', amounts: [] },
      ],
      // The query returns items in its own order, not the store's.
      [item('a'), item('b')]
    );
    expect(cards.map(card => card.item.id)).toEqual(['b', 'a']);
  });

  it('OMS-REG-DIS-12.5: a common medicine whose item did not come back gets no card', () => {
    const cards = buildCards(
      [
        { itemId: 'gone', amounts: [10] },
        { itemId: 'a', amounts: [5] },
      ],
      [item('a')]
    );
    expect(cards.map(card => card.item.id)).toEqual(['a']);
  });

  it('carries the usual amounts in the order set', () => {
    const [card] = buildCards(
      [{ itemId: 'a', amounts: [30, 10, 20] }],
      [item('a')]
    );
    expect(card?.medicine.amounts).toEqual([30, 10, 20]);
  });
});

describe('availableUnits', () => {
  it('sums available packs times pack size across batches', () => {
    expect(
      availableUnits(
        item('a', [
          { availableNumberOfPacks: 2, packSize: 100 },
          { availableNumberOfPacks: 0.5, packSize: 10 },
        ])
      )
    ).toBe(205);
  });

  it('is zero with no available batches', () => {
    expect(availableUnits(item('a'))).toBe(0);
  });
});

describe('stockState', () => {
  it('OMS-REG-DIS-12.12: none available is out', () => {
    expect(stockState(0, [10, 20])).toBe('out');
  });

  it('OMS-REG-DIS-12.10: some, but less than twice the largest usual amount, is low', () => {
    expect(stockState(39, [10, 20])).toBe('low');
    expect(stockState(1, [10, 20])).toBe('low');
  });

  it('OMS-REG-DIS-12.11: at least twice the largest usual amount shows no stock line', () => {
    expect(stockState(40, [10, 20])).toBe('plenty');
  });

  it('with no usual amounts, is low below two units', () => {
    expect(stockState(1, [])).toBe('low');
    expect(stockState(2, [])).toBe('plenty');
  });
});
