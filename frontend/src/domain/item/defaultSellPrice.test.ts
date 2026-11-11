import { describe, expect, it } from 'vitest';
import {
  defaultSellPriceAtPackSize,
  isDefaultSellPrice,
  perUnitAtPackSize,
  samePrice,
} from './defaultSellPrice';

// What a transfer's read-only cost (OMS-REG-REPL-09.44), any batch's volume
// per pack (.45) and every new batch's default sell price follow on a
// pack-size change (spec/stock rules › Default sell price for new stock).
describe('perUnitAtPackSize', () => {
  it('keeps the default price per unit at another pack size', () => {
    expect(perUnitAtPackSize(10, 100, 50)).toBe(5);
    expect(perUnitAtPackSize(10, 100, 200)).toBe(20);
  });

  it('is the default price at the default pack size', () => {
    expect(perUnitAtPackSize(10, 100, 100)).toBe(10);
  });

  it('is exactly the default price back at the default pack size, with no drift', () => {
    expect(perUnitAtPackSize(0.1, 3, 3)).toBe(0.1);
  });

  it('is zero where the item has no default pack size', () => {
    expect(perUnitAtPackSize(10, 0, 50)).toBe(0);
  });
});

describe('defaultSellPriceAtPackSize', () => {
  const item = { defaultPackSize: 10, defaultSellPricePerPack: 5 };

  it('is the default sell price at the default pack size', () => {
    expect(defaultSellPriceAtPackSize(item, 10)).toBe(5);
  });

  it('scales to another pack size at the same price per unit', () => {
    expect(defaultSellPriceAtPackSize(item, 20)).toBe(10);
    expect(defaultSellPriceAtPackSize(item, 1)).toBe(0.5);
  });

  it('is zero with no default sell price', () => {
    expect(
      defaultSellPriceAtPackSize(
        { defaultPackSize: 10, defaultSellPricePerPack: 0 },
        20
      )
    ).toBe(0);
    expect(
      defaultSellPriceAtPackSize(
        { defaultPackSize: 10, defaultSellPricePerPack: null },
        20
      )
    ).toBe(0);
    expect(
      defaultSellPriceAtPackSize(
        { defaultPackSize: 10, defaultSellPricePerPack: undefined },
        10
      )
    ).toBe(0);
  });

  it('is zero with no default pack size', () => {
    expect(
      defaultSellPriceAtPackSize(
        { defaultPackSize: 0, defaultSellPricePerPack: 5 },
        10
      )
    ).toBe(0);
  });
});

describe('samePrice / isDefaultSellPrice', () => {
  const item = { defaultPackSize: 3, defaultSellPricePerPack: 1 };

  it('treats per-unit floating-point drift as the same price', () => {
    expect(samePrice(0.1 + 0.2, 0.3)).toBe(true);
    expect(isDefaultSellPrice(7 / 3, item, 7)).toBe(true);
  });

  it('tells a typed price from the default', () => {
    expect(samePrice(2.33, 7 / 3)).toBe(false);
    expect(isDefaultSellPrice(2.5, item, 7)).toBe(false);
  });

  it('reads zero as the default where there is none', () => {
    expect(
      isDefaultSellPrice(
        0,
        { defaultPackSize: 3, defaultSellPricePerPack: 0 },
        7
      )
    ).toBe(true);
  });
});
