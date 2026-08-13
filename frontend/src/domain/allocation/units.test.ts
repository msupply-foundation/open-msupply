import { describe, expect, it } from 'vitest';
import {
  clampManualPacks,
  distinctPackSizes,
  dosesToPacks,
  issuedUnits,
  lensToUnits,
  packsToDoses,
  round9,
  unitsToLens,
} from './units';

describe('clampManualPacks (AC-AL6 — 0…available, whole vs partial packs)', () => {
  it('floors negatives and non-finite input at zero (both modes)', () => {
    expect(clampManualPacks(-3, 10)).toBe(0);
    expect(clampManualPacks(Number.NaN, 10)).toBe(0);
    expect(clampManualPacks(undefined, 10)).toBe(0);
    expect(clampManualPacks(-3, 10, { partialPacks: true })).toBe(0);
    expect(clampManualPacks(Number.NaN, 10, { partialPacks: true })).toBe(0);
  });

  it('whole-pack mode rounds a fraction UP and clamps beyond-availability DOWN to the whole-pack floor', () => {
    expect(clampManualPacks(2.2, 10)).toBe(3);
    expect(clampManualPacks(99, 10.6)).toBe(10);
    expect(clampManualPacks(0.4, 10)).toBe(1);
  });

  it('partial-pack mode keeps the exact fraction, bounded to raw availability', () => {
    expect(clampManualPacks(0.25, 10, { partialPacks: true })).toBe(0.25);
    expect(clampManualPacks(99, 10.6, { partialPacks: true })).toBe(10.6);
  });

  it('never returns a negative even against a negative (over-reserved) availability', () => {
    expect(clampManualPacks(5, -0.2, { partialPacks: true })).toBe(0);
    expect(clampManualPacks(5, -0.2)).toBe(0);
  });
});

describe('lens conversions (AC-AL7 — lens converts, policy stays in units)', () => {
  it('units lens passes through; negative or non-finite entry converts to undefined', () => {
    expect(lensToUnits(7, { kind: 'units' })).toBe(7);
    expect(lensToUnits(-1, { kind: 'units' })).toBeUndefined();
    expect(lensToUnits(Number.NaN, { kind: 'units' })).toBeUndefined();
    expect(lensToUnits(null, { kind: 'units' })).toBeUndefined();
  });

  it('packs lens multiplies by the size; display divides back', () => {
    expect(lensToUnits(3, { kind: 'packs', size: 12 })).toBe(36);
    expect(unitsToLens(36, { kind: 'packs', size: 12 })).toBe(3);
  });

  it('doses lens divides entry by doses-per-unit (0/missing rate falls back to 1) and multiplies for display', () => {
    expect(lensToUnits(100, { kind: 'doses', dosesPerUnit: 10 })).toBe(10);
    expect(lensToUnits(5, { kind: 'doses', dosesPerUnit: 0 })).toBe(5);
    expect(unitsToLens(10, { kind: 'doses', dosesPerUnit: 10 })).toBe(100);
  });

  it('kills the ÷/× float dust (round9) so converted figures are exact', () => {
    // 0.1 + 0.2 class: 3 doses at 3-per-unit round-trips to exactly 3.
    const units = lensToUnits(3, { kind: 'doses', dosesPerUnit: 3 });
    expect(units).toBe(1);
    expect(unitsToLens(1 / 3, { kind: 'doses', dosesPerUnit: 3 })).toBe(1);
    expect(round9(0.1 + 0.2)).toBe(0.3);
  });
});

describe('unit sums', () => {
  const batches = [
    { packSize: 10, availablePacks: 2, numberOfPacks: 1 },
    { packSize: 5, availablePacks: 4, numberOfPacks: 0.5 },
    { packSize: 10, availablePacks: 3, numberOfPacks: 2 },
    { packSize: 20, availablePacks: 1, numberOfPacks: 0 },
  ];

  it('issuedUnits counts every row, fractional packs included', () => {
    expect(issuedUnits(batches)).toBe(1 * 10 + 0.5 * 5 + 2 * 10);
  });

  it('distinctPackSizes lists each size once', () => {
    expect(distinctPackSizes(batches)).toEqual([10, 5, 20]);
  });
});

describe('packsToDoses / dosesToPacks (per-batch doses lens — old-app parity)', () => {
  it('packsToDoses = packs × pack size × doses-per-unit, rounded to whole doses', () => {
    expect(packsToDoses(3, 1, 10)).toBe(30); // 3 packs × 1 unit × 10 doses/unit
    expect(packsToDoses(2, 12, 1)).toBe(24); // 1 dose/unit → just packs × size
    expect(packsToDoses(1, 1, 3.5)).toBe(4); // 3.5 doses → 4 (doses are whole)
  });

  it('falls back to 1 dose-per-unit on a zero/missing rate (old app dosesPerUnit || 1)', () => {
    expect(packsToDoses(3, 5, 0)).toBe(15); // 0 → 1
    expect(dosesToPacks(15, 5, 0)).toBe(3); // 0 → 1
  });

  it('dosesToPacks inverts through pack size and doses-per-unit (raw, unclamped)', () => {
    expect(dosesToPacks(30, 1, 10)).toBe(3); // exact whole packs
    expect(dosesToPacks(25, 1, 10)).toBe(2.5); // fractional — clamp rounds later
    expect(dosesToPacks(36, 12, 1)).toBe(3);
  });

  it('round-trips a doses entry as the line editor does — convert, whole-pack clamp, report (OMS-REG-DIST-03.19)', () => {
    // 25 doses at 10 doses/vial (pack size 1) = 2.5 packs → rounds UP to 3
    // whole packs, reported back as 30 doses (the over-allocated-line
    // warning: "a quantity of 30 has been allocated rather than 25").
    const packs = clampManualPacks(dosesToPacks(25, 1, 10), 5);
    expect(packs).toBe(3);
    expect(packsToDoses(packs, 1, 10)).toBe(30);
  });

  it('clamps a doses entry beyond availability down to the batch floor', () => {
    // Available 2 packs (= 20 doses); entering 25 doses clamps to 2 packs.
    const packs = clampManualPacks(dosesToPacks(25, 1, 10), 2);
    expect(packs).toBe(2);
    expect(packsToDoses(packs, 1, 10)).toBe(20);
  });
});
