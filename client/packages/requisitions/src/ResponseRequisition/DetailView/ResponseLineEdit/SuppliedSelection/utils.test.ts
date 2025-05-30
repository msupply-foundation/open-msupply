import {
  calculatePackQuantity,
  getCurrentValue,
  getUpdatedSupply,
} from './utils';

describe('caclulatePackQuantity', () => {
  it('should round based on 2dp', () => {
    expect(calculatePackQuantity(1, 4)).toBe(0.25);
    expect(calculatePackQuantity(1, 3)).toBe(0.33);
    expect(calculatePackQuantity(1, 0)).toBe(0);
  });

  it('should return 0 when pack quantity is 0', () => {
    expect(calculatePackQuantity(0, 0)).toBe(0);
  });

  it('should return 0 when pack quantity is undefined', () => {
    expect(calculatePackQuantity(0, undefined)).toBe(0);
  });
});

describe('getCurrentValue', () => {
  describe('when itemType is units', () => {
    it('should return the ceiling of supplyQuantity', () => {
      expect(getCurrentValue('units', 10, 2)).toBe(10);
    });

    it('should round up decimal values', () => {
      expect(getCurrentValue('units', 10.1, 2)).toBe(11);
    });

    it('should return 0 when supplyQuantity is undefined', () => {
      expect(getCurrentValue('units', undefined, 2)).toBe(0);
    });
  });

  describe('when itemType is packs', () => {
    it('should return supplyQuantity divided by pack size', () => {
      expect(getCurrentValue('packs', 10, 2)).toBe(5);
    });

    it('should handle decimal values correctly and maintain precision', () => {
      expect(getCurrentValue('packs', 10.5, 2)).toBe(5.25);
    });

    it('should return 0 when supplyQuantity is undefined', () => {
      expect(getCurrentValue('packs', undefined, 2)).toBe(0);
    });
  });
});

describe('getUpdatedSupply', () => {
  describe('when itemType is units', () => {
    it('should use value directly as supplyQuantity', () => {
      expect(getUpdatedSupply(5, 'units', 2)).toEqual({
        supplyQuantity: 5,
      });
    });

    it('should handle decimal values correctly', () => {
      expect(getUpdatedSupply(5.5, 'units', 2)).toEqual({
        supplyQuantity: 5.5,
      });
    });

    it('should convert undefined value to 1', () => {
      expect(getUpdatedSupply(undefined, 'units', 2)).toEqual({
        supplyQuantity: 0,
      });
    });

    it('should convert NaN value to 0', () => {
      expect(getUpdatedSupply(NaN, 'units', 2)).toEqual({
        supplyQuantity: 0,
      });
    });
  });
  describe('when itemType is packs', () => {
    it('should multiple supplyQuantity by pack size', () => {
      expect(getUpdatedSupply(5, 'packs', 2)).toEqual({
        supplyQuantity: 10,
      });
    });

    it('should handle decimal values correctly', () => {
      expect(getUpdatedSupply(5.5, 'packs', 2)).toEqual({
        supplyQuantity: 11,
      });
    });

    it('should use 1 as a default packSize when undefined', () => {
      expect(getUpdatedSupply(5, 'packs', undefined)).toEqual({
        supplyQuantity: 5,
      });
    });

    it('should convert undefined value to 0', () => {
      expect(getUpdatedSupply(undefined, 'packs', 2)).toEqual({
        supplyQuantity: 0,
      });
    });

    it('should convert NaN value to 0', () => {
      expect(getUpdatedSupply(NaN, 'packs', 2)).toEqual({
        supplyQuantity: 0,
      });
    });
  });
});
