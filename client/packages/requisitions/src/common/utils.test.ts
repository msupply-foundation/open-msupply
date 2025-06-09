import {
  calculateValueInDoses,
  calculateValueInUnitsOrPacks,
  Representation,
} from './utils';

describe('calculateValueInUnitsOrPacks', () => {
  it('returns value as is when package type is UNITS', () => {
    const value = 42;
    const result = calculateValueInUnitsOrPacks(
      Representation.UNITS,
      10,
      value
    );
    expect(result).toBe(value);
  });

  it('divides value by default pack size when package type is PACKS', () => {
    const value = 100;
    const defaultPackSize = 10;
    const result = calculateValueInUnitsOrPacks(
      Representation.PACKS,
      defaultPackSize,
      value
    );
    expect(result).toBe(value / defaultPackSize);
  });
});

describe('calculateValueInDoses', () => {
  it('should return 0 when value is null or undefined', () => {
    expect(calculateValueInDoses(Representation.UNITS, 10, 5, null)).toBe(0);
    expect(calculateValueInDoses(Representation.PACKS, 10, 5, undefined)).toBe(
      0
    );
  });

  describe('when representation is UNITS', () => {
    it('should multiply value by dosesPerUnit', () => {
      // 10 units × 5 doses per unit = 50 doses
      expect(calculateValueInDoses(Representation.UNITS, 10, 5, 10)).toBe(50);

      // 1 unit × 1 dose per unit = 1 dose
      expect(calculateValueInDoses(Representation.UNITS, 10, 1, 1)).toBe(1);

      // 100 units × 2 doses per unit = 200 doses
      expect(calculateValueInDoses(Representation.UNITS, 10, 2, 100)).toBe(200);
    });
  });

  describe('when representation is PACKS', () => {
    it('should multiply value by defaultPackSize and dosesPerUnit', () => {
      // 5 packs × 10 units per pack × 2 doses per unit = 100 doses
      expect(calculateValueInDoses(Representation.PACKS, 10, 2, 5)).toBe(100);

      // 1 pack × 20 units per pack × 5 doses per unit = 100 doses
      expect(calculateValueInDoses(Representation.PACKS, 20, 5, 1)).toBe(100);

      // 2 packs × 5 units per pack × 10 doses per unit = 100 doses
      expect(calculateValueInDoses(Representation.PACKS, 5, 10, 2)).toBe(100);
    });
  });

  it('should handle fractional values', () => {
    // 0.5 packs × 10 units per pack × 2 doses per unit = 10 doses
    expect(calculateValueInDoses(Representation.PACKS, 10, 2, 0.5)).toBe(10);

    // 2.5 units × 2 doses per unit = 5 doses
    expect(calculateValueInDoses(Representation.UNITS, 10, 2, 2.5)).toBe(5);
  });

  it('should round to two decimal places', () => {
    // 3.333 packs × 10 units per pack × 2 doses per unit = 66.66 doses
    expect(
      calculateValueInDoses(Representation.PACKS, 10, 2, 3.333)
    ).toBeCloseTo(66.66, 2);

    // 1.111 units × 2 doses per unit = 2.22 doses
    expect(
      calculateValueInDoses(Representation.UNITS, 10, 2, 1.111)
    ).toBeCloseTo(2.22, 2);
  });
});
