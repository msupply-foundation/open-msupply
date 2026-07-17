import { describe, expect, it } from 'vitest';
import { distributeIssue, type DistributableLine } from './distributeIssue';

// The shared client-side FEFO distribution (spec/stock-allocation). Each test
// cites the acceptance criterion it exercises
// (spec/stock-allocation/acceptance.md); server-side allocation twins are
// exercised by the shared e2e suites against the real backend.

const line = (
  id: string,
  packSize: number,
  availablePacks: number,
  barred = false
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

  // AC-AL4 — shortfall: less stock than requested issues what exists and
  // reports the remainder (the consumer's remainder concept).
  it('AC-AL4: shortfall beyond available stock is reported', () => {
    const result = distributeIssue([line('a', 2, 3)], 10);
    expect(result.packsById.get('a')).toBe(3);
    expect(result.shortfallUnits).toBe(4);
  });

  // AC-AL2 — unusable stock is never issued from and the skip is reported
  // (on hold / expired / unusable VVM are all `barred` here; the consumer's
  // policy maps each condition into the flag — see policy.ts).
  it('AC-AL2: barred batches are skipped and reported', () => {
    const result = distributeIssue(
      [line('held', 1, 10, true), line('ok', 1, 10)],
      5
    );
    expect(result.packsById.get('held')).toBe(0);
    expect(result.packsById.get('ok')).toBe(5);
    expect(result.skippedBarred).toBe(true);
  });

  // AC-AL6 — the client never produces a negative or beyond-available issue:
  // requests are clamped at zero and every take is capped at availablePacks.
  it('AC-AL6: never issues negative quantities or beyond availability', () => {
    const negative = distributeIssue([line('a', 1, 5)], -3);
    expect(negative.packsById.get('a')).toBe(0);
    expect(negative.shortfallUnits).toBe(0);

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
