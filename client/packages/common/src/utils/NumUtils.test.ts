import { NumUtils } from './NumUtils';
describe('NumUtils', () => {
  it('is defined', () => {
    expect(NumUtils.isPositive).toBeDefined();
  });

  it('isPositive', () => {
    expect(NumUtils.isPositive(0)).toBe(false);
    expect(NumUtils.isPositive(1)).toBe(true);
    expect(NumUtils.isPositive(-1)).toBe(false);
  });
});
