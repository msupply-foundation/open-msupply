import {
  calculatePackQuantity,
  getCurrentValue,
  getUpdatedRequest,
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
    it('should return the ceiling of requestedQuantity', () => {
      expect(getCurrentValue('units', 10, 2)).toBe(10);
    });

    it('should round up decimal values', () => {
      expect(getCurrentValue('units', 10.1, 2)).toBe(11);
    });

    it('should return 0 when requestedQuantity is undefined', () => {
      expect(getCurrentValue('units', undefined, 2)).toBe(0);
    });
  });

  describe('when itemType is packs', () => {
    it('should return requestedQuantity divided by pack size', () => {
      expect(getCurrentValue('packs', 10, 2)).toBe(5);
    });

    it('should handle decimal values correctly and maintain precision', () => {
      expect(getCurrentValue('packs', 10.5, 2)).toBe(5.25);
    });

    it('should return 0 when requestedQuantity is undefined', () => {
      expect(getCurrentValue('packs', undefined, 2)).toBe(0);
    });
  });
});

describe('getUpdatedRequest', () => {
  describe('when itemType is units', () => {
    it('should use value directly as requestedQuantity', () => {
      expect(getUpdatedRequest(5, 'units', 2)).toEqual({
        requestedQuantity: 5,
      });
    });

    it('should handle decimal values correctly', () => {
      expect(getUpdatedRequest(5.5, 'units', 2)).toEqual({
        requestedQuantity: 5.5,
      });
    });

    it('should convert undefined value to 0', () => {
      expect(getUpdatedRequest(undefined, 'units', 2)).toEqual({
        requestedQuantity: 0,
      });
    });

    it('should convert NaN value to 0', () => {
      expect(getUpdatedRequest(NaN, 'units', 2)).toEqual({
        requestedQuantity: 0,
      });
    });

    it('should include reason as null when requestedQuantity is equal to suggestedQuantity', () => {
      expect(getUpdatedRequest(5, 'units', 2, 5)).toEqual({
        requestedQuantity: 5,
        reason: null,
      });
    });
  });
  describe('when itemType is packs', () => {
    it('should multiple requestedQuantity by pack size', () => {
      expect(getUpdatedRequest(5, 'packs', 2)).toEqual({
        requestedQuantity: 10,
      });
    });

    it('should handle decimal values correctly', () => {
      expect(getUpdatedRequest(5.5, 'packs', 2)).toEqual({
        requestedQuantity: 11,
      });
    });

    it('should use 0 as a default packSize when undefined', () => {
      expect(getUpdatedRequest(5, 'packs', undefined)).toEqual({
        requestedQuantity: 0,
      });
    });

    it('should convert undefined value to 0', () => {
      expect(getUpdatedRequest(undefined, 'packs', 2)).toEqual({
        requestedQuantity: 0,
      });
    });

    it('should convert NaN value to 0', () => {
      expect(getUpdatedRequest(NaN, 'packs', 2)).toEqual({
        requestedQuantity: 0,
      });
    });

    it('should return reason as null when requestedQuantity is equal to suggestedQuantity', () => {
      expect(getUpdatedRequest(5, 'packs', 2, 10)).toEqual({
        requestedQuantity: 10,
        reason: null,
      });
    });
  });
});
