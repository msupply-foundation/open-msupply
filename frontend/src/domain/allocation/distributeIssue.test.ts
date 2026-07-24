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
