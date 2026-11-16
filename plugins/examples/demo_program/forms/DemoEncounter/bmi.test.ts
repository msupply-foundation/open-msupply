import { describe, expect, it } from 'vitest';
import { bmi } from './bmi';

describe('bmi', () => {
  it('is weight over height in metres squared, to one decimal', () => {
    expect(bmi(70, 175)).toBe(22.9);
    expect(bmi(52.5, 160)).toBe(20.5);
  });

  it('is undefined until both values are present and positive', () => {
    expect(bmi(undefined, 175)).toBeUndefined();
    expect(bmi(70, undefined)).toBeUndefined();
    expect(bmi(0, 175)).toBeUndefined();
    expect(bmi(70, -1)).toBeUndefined();
  });
});
