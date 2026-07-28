import { describe, it, expect } from 'vitest';
import {
  packsToUnits,
  packsToValue,
  totalVolume,
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
// the UI computes, citing the behaviour each mirrors.
//
// Anchors: spec/stock/cases/OMS-REG-SMV-08.
//   .7  — the new line holds the repacked packs at the new pack size
//   .16 — a fractional converted quantity is rejected
//   .22 — a same-size repack succeeds as a pure relocation
// Anchors: spec/stock/cases/OMS-REG-SMV-02.
//   .30 — the flow previews current and adjusted quantities
//   .31 — confirm stays disabled while the amount is zero
//   .32 — confirm stays disabled while the preview would go below zero
//   .29 — an accepted backdated adjustment is stamped at the backdated moment

describe('stock units & value (spec/stock S1 columns)', () => {
  it('units = packs × pack size, value = packs × cost', () => {
    expect(packsToUnits(12, 100)).toBe(1200);
    expect(packsToValue(12, 2.5)).toBe(30);
  });
});

describe('total volume (spec/stock S2 — computed, not stored)', () => {
  it('total volume = volume per pack × packs on hand', () => {
    expect(totalVolume(0.25, 12)).toBe(3);
    // A cleared volume-per-pack zeroes the total rather than keeping the
    // last-saved figure (#601).
    expect(totalVolume(0, 12)).toBe(0);
  });
});

describe('OMS-REG-SMV-08.7/.16 — repack split math', () => {
  it('.7: new packs = packs × old size ÷ new size', () => {
    // 10 packs of size 100 → size 50 = 20 new packs.
    expect(repackNewPacks(10, 100, 50)).toBe(20);
    // Same-size repack (pure relocation, .22) conserves the count.
    expect(repackNewPacks(7, 20, 20)).toBe(7);
  });
  it('undefined when the new pack size is not positive', () => {
    expect(repackNewPacks(10, 100, 0)).toBeUndefined();
  });
  it('.16: whole packs only — a fractional result is not whole', () => {
    // 5 packs of size 10 → size 4 = 12.5 (fractional → rejected).
    const fractional = repackNewPacks(5, 10, 4);
    expect(fractional).toBe(12.5);
    expect(isWholePacks(fractional)).toBe(false);
    expect(isWholePacks(repackNewPacks(10, 100, 50))).toBe(true);
    expect(isWholePacks(undefined)).toBe(false);
  });
});

describe('OMS-REG-SMV-02.30–.32 — adjustment preview + confirm gating', () => {
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

describe('OMS-REG-SMV-02.29 — backdated instant', () => {
  const today = '2026-07-21';
  it('today or no date → not backdated', () => {
    expect(backdatedDatetime(null, today, 'REDUCTION')).toBeUndefined();
    expect(backdatedDatetime(today, today, 'ADDITION')).toBeUndefined();
  });
  // Expected instants built with the local Date constructor: the picked local
  // day's start/end as a UTC instant (#456), so it holds in any device zone.
  it('a backdated reduction stamps the local day end; an addition the day start', () => {
    expect(backdatedDatetime('2020-01-01', today, 'REDUCTION')).toBe(
      new Date(2020, 0, 1, 23, 59, 59, 999).toISOString()
    );
    expect(backdatedDatetime('2020-01-01', today, 'ADDITION')).toBe(
      new Date(2020, 0, 1).toISOString()
    );
  });
});
