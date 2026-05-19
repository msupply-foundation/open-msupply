import {
  unitsToRepresentation,
  representationToUnits,
  getUpdatedRequest,
} from './utils';

describe('unitsToRepresentation', () => {
  describe('when representation is packs', () => {
    it('should round based on 2dp', () => {
      expect(unitsToRepresentation(1, 'packs', 4)).toBe(0.25);
      expect(unitsToRepresentation(1, 'packs', 3)).toBe(0.33);
    });
    it('should return requestedQuantity divided by pack size', () => {
      expect(unitsToRepresentation(10, 'packs', 2)).toBe(5);
    });
    it('should return 0 when units is 0', () => {
      expect(unitsToRepresentation(0, 'packs', 2)).toBe(0);
    });

    it('should return 0 when units is 0 and pack size is undefined', () => {
      expect(unitsToRepresentation(0, 'packs', undefined)).toBe(0);
    });
  });

  describe('when representation is units', () => {
    it('should return the ceiling of units', () => {
      expect(unitsToRepresentation(10, 'units')).toBe(10);
    });

    it('should round up decimal values', () => {
      expect(unitsToRepresentation(10.1, 'units')).toBe(11);
    });
  });

  describe('when representation is doses', () => {
    it('should return units multiplied by dosesPerUnit', () => {
      expect(unitsToRepresentation(10, 'doses', undefined, 5)).toBe(50);
    });

    it('should return 0 when units is 0', () => {
      expect(unitsToRepresentation(0, 'doses', undefined, 5)).toBe(0);
    });
  });
});

describe('representationToUnits', () => {
  it('should return value as-is for units', () => {
    expect(representationToUnits(5, 'units')).toBe(5);
  });

  it('should multiply value by pack size for packs', () => {
    expect(representationToUnits(5, 'packs', 2)).toBe(10);
  });

  it('should ceil doses divided by dosesPerUnit', () => {
    expect(representationToUnits(7, 'doses', undefined, 5)).toBe(2);
  });

  it('should return 0 for NaN input', () => {
    expect(representationToUnits(NaN, 'units')).toBe(0);
    expect(representationToUnits(NaN, 'packs', 2)).toBe(0);
    expect(representationToUnits(NaN, 'doses', undefined, 5)).toBe(0);
  });
});

describe('getUpdatedRequest', () => {
  describe('when representation is units', () => {
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

    it('should include reason as null when requestedQuantity is equal to suggestedQuantity', () => {
      expect(getUpdatedRequest(5, 'units', 2, 5)).toEqual({
        requestedQuantity: 5,
        reason: null,
      });
    });
  });

  describe('when representation is packs', () => {
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

    it('should return reason as null when requestedQuantity is equal to suggestedQuantity', () => {
      expect(getUpdatedRequest(5, 'packs', 2, 10)).toEqual({
        requestedQuantity: 10,
        reason: null,
      });
    });
  });

  describe('when representation is doses', () => {
    it('should convert doses to units', () => {
      expect(getUpdatedRequest(10, 'doses', undefined, undefined, 5)).toEqual({
        requestedQuantity: 2,
      });
    });

    it('should handle fractional units by ceiling', () => {
      expect(getUpdatedRequest(7, 'doses', undefined, undefined, 5)).toEqual({
        requestedQuantity: 2,
      });
    });

    it('should convert undefined value to 0', () => {
      expect(
        getUpdatedRequest(undefined, 'doses', undefined, undefined, 5)
      ).toEqual({
        requestedQuantity: 0,
      });
    });

    it('should return reason as null when requestedQuantity is equal to suggestedQuantity', () => {
      expect(getUpdatedRequest(10, 'doses', undefined, 2, 5)).toEqual({
        requestedQuantity: 2,
        reason: null,
      });
    });
  });
});
