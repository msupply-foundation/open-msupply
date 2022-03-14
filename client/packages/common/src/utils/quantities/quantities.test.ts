import { QuantityUtils } from './quantities';

describe('QuantityUtils - suggested quantity', () => {
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
