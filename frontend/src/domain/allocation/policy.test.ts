import { describe, expect, it } from 'vitest';
import {
  barReasons,
  fefoCompare,
  fillOrderCompare,
  isBarred,
  type AllocationPreferences,
} from './policy';
import { lensToUnits, unitsToLens, availableUnits, distinctPackSizes } from './units';
import { deriveIssueWarnings } from './warnings';

// The shared barred-batch policy, FEFO comparator, lens conversion, and
// warning derivation (spec/stock-allocation).

const prefs = (over: Partial<AllocationPreferences> = {}) => ({
  expiredStockPreventIssue: false,
  expiredStockIssueThreshold: 0,
  manageVvmStatusForStock: false,
  sortByVvmStatusThenExpiry: false,
  ...over,
});

describe('barReasons / isBarred', () => {
  // AC-AL2 — on hold bars, batch or location.
  it('bars on-hold batches and on-hold locations', () => {
    expect(barReasons({ stockLineOnHold: true }, prefs())).toEqual(['on-hold']);
    expect(
      barReasons(
        { stockLineOnHold: false, location: { onHold: true } },
        prefs()
      )
    ).toEqual(['on-hold']);
    expect(isBarred({ stockLineOnHold: false }, prefs())).toBe(false);
  });

  // AC-AL2/AC-AL9 — unusable VVM bars only under the preference.
  it('bars unusable VVM only when the preference is on', () => {
    const batch = { stockLineOnHold: false, vvmStatus: { unusable: true } };
    expect(barReasons(batch, prefs())).toEqual([]);
    expect(barReasons(batch, prefs({ manageVvmStatusForStock: true }))).toEqual(
      ['unusable-vvm']
    );
  });

  // AC-AL8 — the expired-issue guard bars within the threshold, gated by the
  // preference. The clock is injected so the boundary is exact.
  it('bars expiry within the threshold only when the guard is on', () => {
    const today = new Date('2026-07-17T09:30:00');
    const guard = prefs({
      expiredStockPreventIssue: true,
      expiredStockIssueThreshold: 30,
    });
    const at = (expiryDate: string) => ({ stockLineOnHold: false, expiryDate });

    expect(barReasons(at('2026-07-22'), prefs(), today)).toEqual([]);
    expect(barReasons(at('2026-07-22'), guard, today)).toEqual(['expired']);
    expect(barReasons(at('2026-12-01'), guard, today)).toEqual([]);
  });

  // rules.md § barred batches — the guard compares calendar DAYS, so the
  // verdict cannot flip with the time of day the check runs.
  it('is deterministic across the day at the threshold boundary', () => {
    const guard = prefs({
      expiredStockPreventIssue: true,
      expiredStockIssueThreshold: 30,
    });
    const batch = { stockLineOnHold: false, expiryDate: '2026-08-16' };
    for (const clock of [
      '2026-07-17T00:00:01',
      '2026-07-17T12:00:00',
      '2026-07-17T23:59:59',
    ]) {
      // today + 30d = 2026-08-16 → the expiry day itself is barred, at any
      // time of day.
      expect(barReasons(batch, guard, new Date(clock))).toEqual(['expired']);
    }
    // One day later is out of the threshold, again at any time of day.
    const dayAfter = { stockLineOnHold: false, expiryDate: '2026-08-17' };
    for (const clock of ['2026-07-17T00:00:01', '2026-07-17T23:59:59']) {
      expect(barReasons(dayAfter, guard, new Date(clock))).toEqual([]);
    }
  });

  it('reports every category that applies', () => {
    const batch = {
      stockLineOnHold: true,
      vvmStatus: { unusable: true },
      expiryDate: '2020-01-01',
    };
    expect(
      barReasons(
        batch,
        prefs({
          expiredStockPreventIssue: true,
          manageVvmStatusForStock: true,
        })
      ).sort()
    ).toEqual(['expired', 'on-hold', 'unusable-vvm']);
  });
});

describe('fefoCompare', () => {
  // AC-AL1 — earliest expiry first, no expiry last.
  it('orders earliest expiry first with no-expiry last', () => {
    const sorted = [
      { id: 'none', expiryDate: null },
      { id: 'late', expiryDate: '2027-01-01' },
      { id: 'early', expiryDate: '2026-01-01' },
    ].sort(fefoCompare);
    expect(sorted.map(line => line.id)).toEqual(['early', 'late', 'none']);
  });
});

describe('fillOrderCompare', () => {
  const lines = [
    { id: 'p2-early', expiryDate: '2026-01-01', vvmStatus: { priority: 2 } },
    { id: 'p1-late', expiryDate: '2027-06-01', vvmStatus: { priority: 1 } },
    { id: 'none-early', expiryDate: '2025-01-01', vvmStatus: null },
    { id: 'p1-early', expiryDate: '2026-06-01', vvmStatus: { priority: 1 } },
    { id: 'none-none', expiryDate: null },
  ];

  // AC-AL1 — the preference OFF leaves pure FEFO (VVM priority ignored).
  it('is pure FEFO while the preference is off', () => {
    const sorted = [...lines].sort((a, b) => fillOrderCompare(a, b, prefs()));
    expect(sorted.map(line => line.id)).toEqual([
      'none-early',
      'p2-early',
      'p1-early',
      'p1-late',
      'none-none',
    ]);
  });

  // AC-AL1 (VVM-then-expiry variant) — priority ascending (1 before 2),
  // no-status last, expiry breaking ties within a priority; matches the
  // server's `priority asc nulls last, expiry asc nulls last`.
  it('orders VVM priority then expiry under the preference', () => {
    const sorted = [...lines].sort((a, b) =>
      fillOrderCompare(a, b, prefs({ sortByVvmStatusThenExpiry: true }))
    );
    expect(sorted.map(line => line.id)).toEqual([
      'p1-early',
      'p1-late',
      'p2-early',
      'none-early',
      'none-none',
    ]);
  });
});

describe('lensToUnits', () => {
  // AC-AL7 — packs-of-‹size› converts; AC-AL6 — negatives and non-finite
  // values distribute nothing.
  it('converts the packs lens and rejects negatives and non-finite input', () => {
    expect(lensToUnits(3, { kind: 'packs', size: 10 })).toBe(30);
    expect(lensToUnits(3, { kind: 'units' })).toBe(3);
    expect(lensToUnits(-1, { kind: 'units' })).toBeUndefined();
    expect(lensToUnits(null, { kind: 'units' })).toBeUndefined();
    expect(lensToUnits(Number.NaN, { kind: 'units' })).toBeUndefined();
    expect(
      lensToUnits(Number.POSITIVE_INFINITY, { kind: 'packs', size: 10 })
    ).toBeUndefined();
  });

  // AC-AL7 — the doses lens converts by the item's doses-per-unit (doses =
  // units × dosesPerUnit), zero/missing rate falling back to 1; the policy
  // still distributes in units.
  it('converts the doses lens both ways', () => {
    expect(lensToUnits(20, { kind: 'doses', dosesPerUnit: 10 })).toBe(2);
    expect(lensToUnits(20, { kind: 'doses', dosesPerUnit: 0 })).toBe(20);
    expect(lensToUnits(-1, { kind: 'doses', dosesPerUnit: 10 })).toBeUndefined();
    expect(unitsToLens(2, { kind: 'doses', dosesPerUnit: 10 })).toBe(20);
    expect(unitsToLens(30, { kind: 'packs', size: 10 })).toBe(3);
    expect(unitsToLens(7, { kind: 'units' })).toBe(7);
  });
});

describe('unit sums', () => {
  it('sums available units and lists distinct pack sizes', () => {
    const batches = [
      { packSize: 10, availablePacks: 2, numberOfPacks: 0 },
      { packSize: 5, availablePacks: 3, numberOfPacks: 1 },
      { packSize: 10, availablePacks: 1, numberOfPacks: 0 },
    ];
    expect(availableUnits(batches)).toBe(45);
    expect(distinctPackSizes(batches)).toEqual([10, 5]);
  });

  it('excludes on-hold batches from available units (old-app parity)', () => {
    // On-hold stock line or on-hold location → not counted; expired/unusable
    // are still counted (only hold is excluded).
    const batches = [
      { packSize: 10, availablePacks: 2, numberOfPacks: 0 },
      {
        packSize: 10,
        availablePacks: 5,
        numberOfPacks: 0,
        stockLineOnHold: true,
      },
      {
        packSize: 10,
        availablePacks: 3,
        numberOfPacks: 0,
        location: { onHold: true },
      },
    ];
    expect(availableUnits(batches)).toBe(20);
  });
});

describe('deriveIssueWarnings', () => {
  // rules.md § reporting — every deviation reported, nothing narrows silently.
  it('reports over-allocation, shortfall (when consumed), and per-category skips', () => {
    const distribution = {
      packsById: new Map<string, number>(),
      shortfallUnits: 4,
      overAllocatedUnits: 2,
      skippedReasons: new Set(['on-hold', 'expired'] as const),
    };
    const reported = deriveIssueWarnings(distribution, {
      reportShortfall: true,
    });
    expect(reported.map(warning => warning.kind)).toEqual([
      'over-allocated',
      'shortfall',
      'skipped-barred',
    ]);
    expect(reported.find(warning => warning.kind === 'skipped-barred')).toEqual(
      { kind: 'skipped-barred', reasons: ['on-hold', 'expired'] }
    );
    expect(
      deriveIssueWarnings(distribution, { reportShortfall: false }).map(
        warning => warning.kind
      )
    ).toEqual(['over-allocated', 'skipped-barred']);
  });
});
