import { NumUtils } from './NumUtils';

describe('NumUtils', () => {
  it('is defined', () => {
    expect(NumUtils.isPositive).toBeDefined();
    expect(NumUtils.parseString).toBeDefined();
  });

  describe('isPositive', () => {
    it('returns true only for values > 0', () => {
      expect(NumUtils.isPositive(0)).toBe(false);
      expect(NumUtils.isPositive(1)).toBe(true);
      expect(NumUtils.isPositive(-1)).toBe(false);
    });
  });

  describe('parseString', () => {
    it('parses numbers and clamps to a range', () => {
      expect(NumUtils.parseString('5')).toBe(5);
      expect(NumUtils.parseString('-1')).toBe(0);
      expect(NumUtils.parseString('5', 4)).toBe(5);
      expect(NumUtils.parseString('4', 5)).toBe(5);
      expect(NumUtils.parseString('4', 1, 10)).toBe(4);
      expect(NumUtils.parseString('40', 1, 10)).toBe(10);
      expect(NumUtils.parseString('4.56')).toBe(4.56);
    });
  });

  describe('hasMoreThanDp', () => {
    it('detects values with more than the specified decimal places', () => {
      expect(NumUtils.hasMoreThanDp(4, 0)).toBe(false);
      expect(NumUtils.hasMoreThanDp(4.4, 0)).toBe(true);

      expect(NumUtils.hasMoreThanDp(4.4, 2)).toBe(false);
      expect(NumUtils.hasMoreThanDp(4.40000000000006, 2)).toBe(false);
      expect(NumUtils.hasMoreThanDp(4.41, 2)).toBe(false);
      expect(NumUtils.hasMoreThanDp(4.411, 2)).toBe(true);

      expect(NumUtils.hasMoreThanDp(0.1234, 3)).toBe(true);
      expect(NumUtils.hasMoreThanDp(0.123, 3)).toBe(false);
    });

    it('handles very large numbers', () => {
      // At this magnitude, doubles can only represent fractional steps of 0.125.
      const veryLargeWithTwoDp = 1e15 + 0.25;
      const veryLargeWithMoreThanTwoDp = 1e15 + 0.375;

      expect(NumUtils.hasMoreThanDp(veryLargeWithTwoDp, 2)).toBe(false);
      expect(NumUtils.hasMoreThanDp(veryLargeWithMoreThanTwoDp, 2)).toBe(true);
    });

    it('handles very small numbers', () => {
      expect(NumUtils.hasMoreThanDp(0.0001, 3)).toBe(true);
      expect(NumUtils.hasMoreThanDp(0.00001, 4)).toBe(true);
      expect(NumUtils.hasMoreThanDp(0.0001, 4)).toBe(false);
    });

    it('handles negative numbers', () => {
      expect(NumUtils.hasMoreThanDp(-0.1234, 3)).toBe(true);
      expect(NumUtils.hasMoreThanDp(-0.123, 3)).toBe(false);
    });

    it('handles negative near-zero boundary cases', () => {
      expect(NumUtils.hasMoreThanDp(-0.0001, 4)).toBe(false);
      expect(NumUtils.hasMoreThanDp(-0.00001, 4)).toBe(true);
    });
  });

  describe('hasMoreThanTwoDp', () => {
    it('matches hasMoreThanDp(value, 2)', () => {
      const values = [4.4, 4.40000000000006, 4.401, 0.01, 0.001, -4.4, -4.401];
      values.forEach(value => {
        expect(NumUtils.hasMoreThanTwoDp(value)).toBe(
          NumUtils.hasMoreThanDp(value, 2)
        );
      });
    });
  });
});
