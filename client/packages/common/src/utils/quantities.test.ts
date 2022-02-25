import { suggestedQuantity } from './quantities';

describe('suggestedQuantity', () => {
  it('is defined', () => {
    expect(suggestedQuantity).toBeDefined();
  });

  it('calculates the correct suggested quantity for a basic case', () => {
    expect(suggestedQuantity(100, 100, 3)).toBe(200);
  });

  it('calculates the correct suggested quantity when amc is zero', () => {
    expect(suggestedQuantity(0, 100, 3)).toBe(0);
  });

  it('calculates the correct suggested quantity when amc is negative', () => {
    expect(suggestedQuantity(-10, 100, 3)).toBe(0);
  });

  it('calculates the correct suggested quantity when soh is zero', () => {
    expect(suggestedQuantity(100, 0, 3)).toBe(300);
  });

  it('calculates the correct suggested quantity when soh is negative', () => {
    expect(suggestedQuantity(100, -100, 3)).toBe(300);
  });

  it('calculates the correct suggested quantity when soh is very high', () => {
    expect(suggestedQuantity(10, 1000, 3)).toBe(0);
  });

  it('calculates the correct suggested quantity when mos is zero', () => {
    expect(suggestedQuantity(10, 100, 0)).toBe(0);
  });

  it('calculates the correct suggested quantity when mos is negative', () => {
    expect(suggestedQuantity(-10, 100, 3)).toBe(0);
  });
});
