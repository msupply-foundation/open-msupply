import { getDefaultSellPricePerPack } from './utils';

describe('getDefaultSellPricePerPack', () => {
  const base = {
    costPricePerPack: 100,
    packSize: 1,
    defaultPackSize: 1,
    defaultSellPricePerPack: 0,
    itemMargin: 0,
    supplierMargin: 0,
    itemMarginOverridesSupplierMargin: false,
    defaultPricePerUnit: 0,
  };

  it('uses the default item price (pack-size adjusted) when set, ignoring margins', () => {
    expect(
      getDefaultSellPricePerPack({
        ...base,
        defaultSellPricePerPack: 20,
        defaultPackSize: 10,
        packSize: 20,
        supplierMargin: 50,
        itemMargin: 50,
      })
    ).toBe(40);
  });

  it('uses the default item price unchanged when pack sizes match', () => {
    expect(
      getDefaultSellPricePerPack({
        ...base,
        defaultSellPricePerPack: 20,
        defaultPackSize: 10,
        packSize: 10,
      })
    ).toBe(20);
  });

  it('scales the default item price down when receiving in a smaller pack', () => {
    // 20 per pack of 10 => 2 per unit => 10 for a pack of 5
    expect(
      getDefaultSellPricePerPack({
        ...base,
        defaultSellPricePerPack: 20,
        defaultPackSize: 10,
        packSize: 5,
      })
    ).toBe(10);
  });

  it('ignores the default item price when the default pack size is 0', () => {
    // Falls through to cost plus margin
    expect(
      getDefaultSellPricePerPack({
        ...base,
        defaultSellPricePerPack: 20,
        defaultPackSize: 0,
        supplierMargin: 10,
      })
    ).toBeCloseTo(110);
  });

  it('applies the supplier margin by default', () => {
    expect(
      getDefaultSellPricePerPack({ ...base, supplierMargin: 10 })
    ).toBeCloseTo(110);
  });

  it('falls back to the item margin when there is no supplier margin', () => {
    expect(getDefaultSellPricePerPack({ ...base, itemMargin: 25 })).toBeCloseTo(
      125
    );
  });

  it('prefers the supplier margin over the item margin by default', () => {
    expect(
      getDefaultSellPricePerPack({
        ...base,
        supplierMargin: 10,
        itemMargin: 50,
      })
    ).toBeCloseTo(110);
  });

  it('prefers the item margin when the preference is enabled', () => {
    expect(
      getDefaultSellPricePerPack({
        ...base,
        supplierMargin: 10,
        itemMargin: 50,
        itemMarginOverridesSupplierMargin: true,
      })
    ).toBeCloseTo(150);
  });

  it('falls back to the supplier margin when item margin is 0 and preference is enabled', () => {
    expect(
      getDefaultSellPricePerPack({
        ...base,
        supplierMargin: 10,
        itemMargin: 0,
        itemMarginOverridesSupplierMargin: true,
      })
    ).toBeCloseTo(110);
  });

  it('uses the master list price (pack-size adjusted) when there is no default item price or margin', () => {
    expect(
      getDefaultSellPricePerPack({
        ...base,
        packSize: 10,
        defaultPricePerUnit: 5,
      })
    ).toBe(50);
  });

  it('prefers a margin over the master list price', () => {
    expect(
      getDefaultSellPricePerPack({
        ...base,
        supplierMargin: 10,
        defaultPricePerUnit: 5,
      })
    ).toBeCloseTo(110);
  });

  it('prefers the default item price over the master list price', () => {
    expect(
      getDefaultSellPricePerPack({
        ...base,
        defaultSellPricePerPack: 20,
        defaultPricePerUnit: 5,
      })
    ).toBe(20);
  });

  it('uses the master list price when a margin is set but the cost price is 0', () => {
    expect(
      getDefaultSellPricePerPack({
        ...base,
        costPricePerPack: 0,
        supplierMargin: 10,
        defaultPricePerUnit: 5,
      })
    ).toBe(5);
  });

  it('returns the cost price when no rules are defined', () => {
    expect(getDefaultSellPricePerPack(base)).toBe(100);
  });
});
