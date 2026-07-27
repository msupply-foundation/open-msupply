import { describe, it, expect } from 'vitest';
import {
  packsToUnits,
  packsToValue,
  repackNewPacks,
  isWholePacks,
  signedAdjustment,
  adjustedQuantity,
  wouldGoBelowZero,
  backdatedDatetime,
} from './stockCalc';

// Unit tests for the pure stock calculations behind the screens. Behavioural
// acceptance against the real backend lives in the e2e/ Playwright suites (the
// conformance contract's C2); these cover the client-side arithmetic / previews
// the UI computes, citing the AC each mirrors.

describe('stock units & value (spec/stock S1 columns)', () => {
  it('units = packs × pack size, value = packs × cost', () => {
    expect(packsToUnits(12, 100)).toBe(1200);
    expect(packsToValue(12, 2.5)).toBe(30);
  });
});

describe('AC-R1 / AC-R3 repack split math', () => {
  it('AC-R1: new packs = packs × old size ÷ new size', () => {
    // 10 packs of size 100 → size 50 = 20 new packs.
    expect(repackNewPacks(10, 100, 50)).toBe(20);
    // Same-size repack (pure relocation, AC-R7) conserves the count.
    expect(repackNewPacks(7, 20, 20)).toBe(7);
  });
  it('undefined when the new pack size is not positive', () => {
    expect(repackNewPacks(10, 100, 0)).toBeUndefined();
  });
  it('AC-R3: whole packs only — a fractional result is not whole', () => {
    // 5 packs of size 10 → size 4 = 12.5 (fractional → rejected).
    const fractional = repackNewPacks(5, 10, 4);
    expect(fractional).toBe(12.5);
    expect(isWholePacks(fractional)).toBe(false);
    expect(isWholePacks(repackNewPacks(10, 100, 50))).toBe(true);
    expect(isWholePacks(undefined)).toBe(false);
  });
});

describe('AC-A12 adjustment preview + below-zero gating', () => {
  it('direction carries the sign; the amount is positive', () => {
    expect(signedAdjustment('ADDITION', 5)).toBe(5);
    expect(signedAdjustment('REDUCTION', 5)).toBe(-5);
  });
  it('additions raise and reductions lower the previewed quantity', () => {
    expect(adjustedQuantity(100, 'ADDITION', 5)).toBe(105);
    expect(adjustedQuantity(100, 'REDUCTION', 5)).toBe(95);
  });
  it('below-zero only for a reduction that exceeds available', () => {
    expect(wouldGoBelowZero(5, 'REDUCTION', 10)).toBe(true);
    expect(wouldGoBelowZero(5, 'REDUCTION', 5)).toBe(false);
    expect(wouldGoBelowZero(5, 'ADDITION', 999)).toBe(false);
  });
});

describe('AC-A10 / AC-A11 backdated instant', () => {
  const today = '2026-07-21';
  it('today or no date → not backdated', () => {
    expect(backdatedDatetime(null, today, 'REDUCTION')).toBeUndefined();
    expect(backdatedDatetime(today, today, 'ADDITION')).toBeUndefined();
  });
  it('a backdated reduction stamps the day end; an addition the day start', () => {
    expect(backdatedDatetime('2020-01-01', today, 'REDUCTION')).toBe(
      '2020-01-01T23:59:59.000Z'
    );
    expect(backdatedDatetime('2020-01-01', today, 'ADDITION')).toBe(
      '2020-01-01T00:00:00.000Z'
    );
  });
});
