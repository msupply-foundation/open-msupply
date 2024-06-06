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

  it('floatMultiply', () => {
    expect(NumUtils.floatMultiply(110.4, 29)).toBe(3201.6);
    expect(NumUtils.floatMultiply(1.001, 1000)).toBe(1001);
  });
});
