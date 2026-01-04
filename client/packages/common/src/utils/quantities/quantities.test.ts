import { QuantityUtils, Representation } from './quantities';

describe('QuantityUtils', () => {
  describe('suggestedQuantity', () => {
    it('is defined', () => {
      expect(QuantityUtils.suggestedQuantity).toBeDefined();
    });

    it('calculates the correct suggested quantity for a basic case', () => {
      expect(QuantityUtils.suggestedQuantity(100, 100, 3)).toBe(200);
    });

    it('calculates the correct suggested quantity when amc is zero', () => {
      expect(QuantityUtils.suggestedQuantity(0, 100, 3)).toBe(0);
    });

    it('calculates the correct suggested quantity when amc is negative', () => {
      expect(QuantityUtils.suggestedQuantity(-10, 100, 3)).toBe(0);
    });

    it('calculates the correct suggested quantity when soh is zero', () => {
      expect(QuantityUtils.suggestedQuantity(100, 0, 3)).toBe(300);
    });

    it('calculates the correct suggested quantity when soh is negative', () => {
      expect(QuantityUtils.suggestedQuantity(100, -100, 3)).toBe(300);
    });

    it('calculates the correct suggested quantity when soh is very high', () => {
      expect(QuantityUtils.suggestedQuantity(10, 1000, 3)).toBe(0);
    });

    it('calculates the correct suggested quantity when mos is zero', () => {
      expect(QuantityUtils.suggestedQuantity(10, 100, 0)).toBe(0);
    });

    it('calculates the correct suggested quantity when mos is negative', () => {
      expect(QuantityUtils.suggestedQuantity(-10, 100, 3)).toBe(0);
    });
  });

  describe('packsToDoses', () => {
    it('calculates doses correctly for a given number of packs', () => {
      const line = { packSize: 10, dosesPerUnit: 2 };
      expect(QuantityUtils.packsToDoses(5, line)).toBe(100);
    });

    it('handles cases with no doses per unit', () => {
      const line = { packSize: 10, dosesPerUnit: 1 };
      expect(QuantityUtils.packsToDoses(5, line)).toBe(50);
    });

    it('rounds to nearest whole dose', () => {
      const numberOfPacks = 0.9166667; //  emulate if 1 of 12 doses has been dispensed
      const line = { packSize: 1, dosesPerUnit: 12 };
      expect(QuantityUtils.packsToDoses(numberOfPacks, line)).toBe(11);
    });
  });

  describe('dosesToPacks', () => {
    it('calculates packs correctly for a given number of doses', () => {
      const line = { packSize: 10, dosesPerUnit: 2 };
      expect(QuantityUtils.dosesToPacks(100, line)).toBe(5);
    });

    it('handles cases with no doses per unit', () => {
      const line = { packSize: 10 };
      expect(QuantityUtils.dosesToPacks(100, line)).toBe(10);
    });
  });
});

describe('calculateValueInUnitsOrPacks', () => {
  it('returns value as is when package type is UNITS', () => {
    const value = 42;
    const result = QuantityUtils.calculateValueInUnitsOrPacks(
      Representation.UNITS,
      10,
      value
    );
    expect(result).toBe(value);
  });

  it('divides value by default pack size when package type is PACKS', () => {
    const value = 100;
    const defaultPackSize = 10;
    const result = QuantityUtils.calculateValueInUnitsOrPacks(
      Representation.PACKS,
      defaultPackSize,
      value
    );
    expect(result).toBe(value / defaultPackSize);
  });
});

describe('calculateValueInDoses', () => {
  it('should return 0 when value is null or undefined', () => {
    expect(
      QuantityUtils.calculateValueInDoses(Representation.UNITS, 10, 5, null)
    ).toBe(0);
    expect(
      QuantityUtils.calculateValueInDoses(
        Representation.PACKS,
        10,
        5,
        undefined
      )
    ).toBe(0);
  });

  describe('when representation is UNITS', () => {
    it('should multiply value by dosesPerUnit', () => {
      // 10 units × 5 doses per unit = 50 doses
      expect(
        QuantityUtils.calculateValueInDoses(Representation.UNITS, 10, 5, 10)
      ).toBe(50);

      // 1 unit × 1 dose per unit = 1 dose
      expect(
        QuantityUtils.calculateValueInDoses(Representation.UNITS, 10, 1, 1)
      ).toBe(1);

      // 100 units × 2 doses per unit = 200 doses
      expect(
        QuantityUtils.calculateValueInDoses(Representation.UNITS, 10, 2, 100)
      ).toBe(200);
    });
  });

  describe('when representation is PACKS', () => {
    it('should multiply value by defaultPackSize and dosesPerUnit', () => {
      // 5 packs × 10 units per pack × 2 doses per unit = 100 doses
      expect(
        QuantityUtils.calculateValueInDoses(Representation.PACKS, 10, 2, 5)
      ).toBe(100);

      // 1 pack × 20 units per pack × 5 doses per unit = 100 doses
      expect(
        QuantityUtils.calculateValueInDoses(Representation.PACKS, 20, 5, 1)
      ).toBe(100);

      // 2 packs × 5 units per pack × 10 doses per unit = 100 doses
      expect(
        QuantityUtils.calculateValueInDoses(Representation.PACKS, 5, 10, 2)
      ).toBe(100);
    });
  });

  it('should handle fractional values', () => {
    // 0.5 packs × 10 units per pack × 2 doses per unit = 10 doses
    expect(
      QuantityUtils.calculateValueInDoses(Representation.PACKS, 10, 2, 0.5)
    ).toBe(10);

    // 2.5 units × 2 doses per unit = 5 doses
    expect(
      QuantityUtils.calculateValueInDoses(Representation.UNITS, 10, 2, 2.5)
    ).toBe(5);
  });
});
