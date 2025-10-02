import { QuantityUtils } from './quantities';

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
