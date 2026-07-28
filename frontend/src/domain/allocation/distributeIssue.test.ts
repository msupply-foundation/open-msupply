import { describe, expect, it } from 'vitest';
import { distributeIssue, type DistributableLine } from './distributeIssue';
import type { BarReason } from './policy';

// The shared client-side FEFO distribution (spec/stock-allocation). Each test
// cites the acceptance criterion it exercises
// (spec/stock-allocation/acceptance.md); server-side allocation twins are
// exercised by the shared e2e suites against the real backend.

const line = (
  id: string,
  packSize: number,
  availablePacks: number,
  barred: readonly BarReason[] = []
): DistributableLine => ({ id, packSize, availablePacks, barred });

describe('distributeIssue', () => {
  // AC-AL1 — FEFO order: packs are issued from the earliest-expiry batch
  // first (the input is FEFO-ordered; distribution consumes it front to back).
  it('AC-AL1: fills earlier batches before later ones', () => {
    const result = distributeIssue(
      [line('first', 1, 5), line('second', 1, 5)],
      7
    );
    expect(result.packsById.get('first')).toBe(5);
    expect(result.packsById.get('second')).toBe(2);
    expect(result.shortfallUnits).toBe(0);
  });

  // AC-AL3 — whole packs only: a fractional need rounds UP to a whole pack;
  // over-allocation (< 1 pack) is reported.
  it('AC-AL3: rounds a fractional pack need up and reports over-allocation', () => {
    const result = distributeIssue([line('a', 10, 5)], 25);
    expect(result.packsById.get('a')).toBe(3); // 30 units, not 2.5 packs
    expect(result.overAllocatedUnits).toBe(5);
    expect(result.shortfallUnits).toBe(0);
  });

  // rules.md § invariants — over-allocation is always LESS than one pack of
  // the batch it arose on (the round-up happens on exactly one batch: the
  // last one drawn from).
  it('invariant: over-allocation stays under one pack of the rounding batch', () => {
    // The rounding batch is the 7-pack line; excess must be < 7.
    const result = distributeIssue([line('a', 10, 2), line('b', 7, 3)], 24);
    expect(result.packsById.get('a')).toBe(2); // 20 units exactly
    expect(result.packsById.get('b')).toBe(1); // 7 units for the last 4
    expect(result.overAllocatedUnits).toBe(3);
    expect(result.overAllocatedUnits).toBeLessThan(7);

    // Property-style sweep across pack sizes and requests.
    for (const packSize of [1, 3, 7, 10, 12]) {
      for (let requested = 0; requested <= 40; requested++) {
        const swept = distributeIssue([line('x', packSize, 100)], requested);
        expect(swept.overAllocatedUnits).toBeLessThan(packSize);
      }
    }
  });

  // AC-AL4 — shortfall: less stock than requested issues what exists and
  // reports the remainder (the consumer's remainder concept).
  it('AC-AL4: shortfall beyond available stock is reported', () => {
    const result = distributeIssue([line('a', 2, 3)], 10);
    expect(result.packsById.get('a')).toBe(3);
    expect(result.shortfallUnits).toBe(4);
  });

  // AC-AL2 — unusable stock is never issued from and EACH skip category that
  // applied is reported (barReasons in policy.ts maps the conditions).
  it('AC-AL2: barred batches are skipped and each category reported', () => {
    const result = distributeIssue(
      [
        line('held', 1, 10, ['on-hold']),
        line('old', 1, 10, ['expired', 'unusable-vvm']),
        line('empty-held', 1, 0, ['on-hold']),
        line('ok', 1, 10),
      ],
      5
    );
    expect(result.packsById.get('held')).toBe(0);
    expect(result.packsById.get('old')).toBe(0);
    expect(result.packsById.get('ok')).toBe(5);
    expect([...result.skippedReasons].sort()).toEqual([
      'expired',
      'on-hold',
      'unusable-vvm',
    ]);
  });

  it('reports no skips when barred batches hold no stock', () => {
    const result = distributeIssue(
      [line('empty-held', 1, 0, ['on-hold']), line('ok', 1, 10)],
      5
    );
    expect(result.skippedReasons.size).toBe(0);
  });

  // AC-AL6 — the client never produces a negative, non-finite, or
  // beyond-available issue: requests are clamped at zero and every take is
  // capped at availablePacks.
  it('AC-AL6: never issues negative, non-finite, or beyond availability', () => {
    const negative = distributeIssue([line('a', 1, 5)], -3);
    expect(negative.packsById.get('a')).toBe(0);
    expect(negative.shortfallUnits).toBe(0);

    const notANumber = distributeIssue([line('a', 1, 5)], Number.NaN);
    expect(notANumber.packsById.get('a')).toBe(0);
    expect(notANumber.shortfallUnits).toBe(0);

    const capped = distributeIssue([line('a', 3, 2)], 100);
    expect(capped.packsById.get('a')).toBe(2);
  });

  // Whole-take path: consuming a batch exactly never rounds (no phantom
  // over-allocation when the request covers whole batches).
  it('takes a whole batch without over-allocation', () => {
    const result = distributeIssue([line('a', 5, 2), line('b', 5, 2)], 10);
    expect(result.packsById.get('a')).toBe(2);
    expect(result.packsById.get('b')).toBe(0);
    expect(result.overAllocatedUnits).toBe(0);
  });
});

// The prescriptions variant (spec/prescriptions AC-A1): dispensing works in
// units, so packs split — the exact request is filled, never rounded up, and
// the whole-pack over-allocation report can't arise.
describe('distributeIssue with partialPacks (prescriptions AC-A1)', () => {
  it('splits a pack to fill the exact requested units', () => {
    const result = distributeIssue(
      [{ id: 'a', packSize: 100, availablePacks: 100, barred: [] }],
      1,
      { partialPacks: true }
    );
    expect(result.packsById.get('a')).toBeCloseTo(0.01, 10);
    expect(result.overAllocatedUnits).toBe(0);
    expect(result.shortfallUnits).toBe(0);
  });

  it('drains earlier batches whole and splits only the last take', () => {
    const result = distributeIssue(
      [
        { id: 'early', packSize: 10, availablePacks: 1, barred: [] },
        { id: 'late', packSize: 10, availablePacks: 5, barred: [] },
      ],
      15,
      { partialPacks: true }
    );
    expect(result.packsById.get('early')).toBe(1);
    expect(result.packsById.get('late')).toBeCloseTo(0.5, 10);
    expect(result.overAllocatedUnits).toBe(0);
  });

  it('still reports the shortfall and skips barred stock', () => {
    const result = distributeIssue(
      [
        { id: 'held', packSize: 1, availablePacks: 50, barred: ['on-hold'] },
        { id: 'ok', packSize: 1, availablePacks: 3, barred: [] },
      ],
      10,
      { partialPacks: true }
    );
    expect(result.packsById.get('held')).toBe(0);
    expect(result.packsById.get('ok')).toBe(3);
    expect(result.shortfallUnits).toBe(7);
    expect([...result.skippedReasons]).toEqual(['on-hold']);
  });
});

// The old app's allocateQuantities scenarios (ported from
// client/packages/invoices/src/StockOut/allocateQuantities.test.ts): the
// three-pass exact-quantity bias — round down, round up, trim from the back.
describe('distributeIssue exact-quantity bias (AC-AL3)', () => {
  it('skips a large pack size in the first pass to avoid over-allocating', () => {
    // 7 from [5×1, 5×10, 10×1] → 5 + 0 (pack of 10 skipped) + 2, exact.
    const result = distributeIssue(
      [line('a', 1, 5), line('b', 10, 5), line('c', 1, 10)],
      7
    );
    expect(result.packsById.get('a')).toBe(5);
    expect(result.packsById.get('b')).toBe(0);
    expect(result.packsById.get('c')).toBe(2);
    expect(result.overAllocatedUnits).toBe(0);
    expect(result.shortfallUnits).toBe(0);
  });

  it('reduces earlier lines after a round-up lands over the request', () => {
    // 20 from [5×1, 5×10] → round up to 5 + 2×10 = 25, then trim the size-1
    // batch back by 5 → 0 + 20, exact (the old doc example's shape).
    const result = distributeIssue([line('a', 1, 5), line('b', 10, 5)], 20);
    expect(result.packsById.get('a')).toBe(0);
    expect(result.packsById.get('b')).toBe(2);
    expect(result.overAllocatedUnits).toBe(0);
    expect(result.shortfallUnits).toBe(0);
  });

  it('reduces the correct quantities per pack size, trimming from the back', () => {
    // 43 from [10×1, 10×2, 10×6]: down-pass 10+20+12=42; up-pass rounds the
    // size-6 batch to 18 (48); trim skips size 6 (> excess 5), takes 2 packs
    // of 2 (44) then 1 pack of 1 → 9 + 8 + 3 = 43, exact.
    const result = distributeIssue(
      [line('a', 1, 10), line('b', 2, 10), line('c', 6, 10)],
      43
    );
    expect(result.packsById.get('a')).toBe(9);
    expect(result.packsById.get('b')).toBe(8);
    expect(result.packsById.get('c')).toBe(3);
    expect(result.overAllocatedUnits).toBe(0);
  });

  it('over-allocates when trimming cannot land on the request', () => {
    // 47 from [5×1, 5×10] → 5 + 50 rounds past it; trimming the size-1 batch
    // (5 units) gets to 50 exactly-not — 0 + 5×10 = 50, over by 3 (no
    // combination of whole packs makes 47).
    const result = distributeIssue([line('a', 1, 5), line('b', 10, 5)], 47);
    expect(result.packsById.get('a')).toBe(0);
    expect(result.packsById.get('b')).toBe(5);
    expect(result.overAllocatedUnits).toBe(3);
    expect(result.shortfallUnits).toBe(0);
  });

  it('surviving over-allocation is smaller than every allocated pack size', () => {
    // 6 from [4×10, 3×10]: down-pass takes one 4-pack; up-pass adds a second
    // (8); trim skips both sizes (> excess 2) → over by 2, below every
    // allocated pack size — even though 3 + 3 would land exactly. The fill is
    // greedy, not an exhaustive search (old-app parity; rules.md
    // § whole-pack arithmetic).
    const result = distributeIssue([line('a', 4, 10), line('b', 3, 10)], 6);
    expect(result.packsById.get('a')).toBe(2);
    expect(result.packsById.get('b')).toBe(0);
    expect(result.overAllocatedUnits).toBe(2);
  });

  it('the doc example: 350 from [200×1, 3×100] lands exactly', () => {
    // Round down 200 + 100; round up the size-100 batch to 2 (400); trim the
    // size-1 batch by 50 → 150 + 200 = 350.
    const result = distributeIssue([line('a', 1, 200), line('b', 100, 3)], 350);
    expect(result.packsById.get('a')).toBe(150);
    expect(result.packsById.get('b')).toBe(2);
    expect(result.overAllocatedUnits).toBe(0);
  });

  it("whole-pack mode never issues a batch's fractional-pack dust", () => {
    const result = distributeIssue([line('a', 10, 5.5)], 60);
    expect(result.packsById.get('a')).toBe(5);
    expect(result.shortfallUnits).toBe(10);
  });
});

describe('distributeIssue under the packs lens (AC-AL11)', () => {
  it('fills only batches of the required pack size, without a skip report', () => {
    // 3 packs of 10 (30 units) from [10×5, 10×10] → only the size-10 batch.
    const result = distributeIssue([line('a', 5, 10), line('b', 10, 10)], 30, {
      requiredPackSize: 10,
    });
    expect(result.packsById.get('a')).toBe(0);
    expect(result.packsById.get('b')).toBe(3);
    expect(result.skippedReasons.size).toBe(0);
    expect(result.shortfallUnits).toBe(0);
  });

  it('reports the uncovered remainder as shortfall when the size runs out', () => {
    const result = distributeIssue([line('a', 5, 10), line('b', 10, 2)], 50, {
      requiredPackSize: 10,
    });
    expect(result.packsById.get('b')).toBe(2);
    expect(result.shortfallUnits).toBe(30);
  });
});

describe('distributeIssue partial-pack gap (AC-AL12)', () => {
  it('reports the units short of whole packs when a pack was split', () => {
    // 7 units from [10×5] partial → 0.7 packs; whole-pack gap = 3 units.
    const result = distributeIssue([line('a', 10, 5)], 7, {
      partialPacks: true,
    });
    expect(result.packsById.get('a')).toBe(0.7);
    expect(result.wholePackGapUnits).toBe(3);
  });

  it('is zero in whole-pack mode and for exact-pack takes', () => {
    expect(distributeIssue([line('a', 10, 5)], 7).wholePackGapUnits).toBe(0);
    expect(
      distributeIssue([line('a', 10, 5)], 20, { partialPacks: true })
        .wholePackGapUnits
    ).toBe(0);
  });
});
