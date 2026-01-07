import { NumUtils } from './NumUtils';
describe('NumUtils', () => {
  it('is defined', () => {
    expect(NumUtils.isPositive).toBeDefined();
    expect(NumUtils.parseString).toBeDefined();
  });

  it('isPositive', () => {
    expect(NumUtils.isPositive(0)).toBe(false);
    expect(NumUtils.isPositive(1)).toBe(true);
    expect(NumUtils.isPositive(-1)).toBe(false);
  });

  it('parseString', () => {
    expect(NumUtils.parseString('5')).toBe(5);
    expect(NumUtils.parseString('-1')).toBe(0);
    expect(NumUtils.parseString('5', 4)).toBe(5);
    expect(NumUtils.parseString('4', 5)).toBe(5);
    expect(NumUtils.parseString('4', 1, 10)).toBe(4);
    expect(NumUtils.parseString('40', 1, 10)).toBe(10);
    expect(NumUtils.parseString('4.56')).toBe(4.56);
  });

  it('hasMoreThanTwoDp', () => {
    expect(NumUtils.hasMoreThanTwoDp(4.4)).toBe(false);
    expect(NumUtils.hasMoreThanTwoDp(4.40000000000006)).toBe(false);
    expect(NumUtils.hasMoreThanTwoDp(4.401)).toBe(true);
    expect(NumUtils.hasMoreThanTwoDp(0.01)).toBe(false);
    expect(NumUtils.hasMoreThanTwoDp(0.001)).toBe(true);
  });

  it('hasMoreThanDp', () => {
    expect(NumUtils.hasMoreThanDp(4, 0)).toBe(false);
    expect(NumUtils.hasMoreThanDp(4.4, 0)).toBe(true);

    expect(NumUtils.hasMoreThanDp(4.4, 2)).toBe(false);
    expect(NumUtils.hasMoreThanDp(4.40000000000006, 2)).toBe(false);
    expect(NumUtils.hasMoreThanDp(4.41, 2)).toBe(false);
    expect(NumUtils.hasMoreThanDp(4.411, 2)).toBe(true);

    expect(NumUtils.hasMoreThanDp(0.1234, 3)).toBe(true);
    expect(NumUtils.hasMoreThanDp(0.123, 3)).toBe(false);
  });
});
