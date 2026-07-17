import { describe, expect, it } from 'vitest';
import { fefoCompare, isBarred, type AllocationPreferences } from './policy';
import { lensToUnits, availableUnits, distinctPackSizes } from './units';
import { deriveIssueWarnings } from './warnings';

// The shared barred-batch policy, FEFO comparator, lens conversion, and
// warning derivation (spec/stock-allocation).

const prefs = (over: Partial<AllocationPreferences> = {}) => ({
  expiredStockPreventIssue: false,
  expiredStockIssueThreshold: 0,
  manageVvmStatusForStock: false,
  ...over,
});

const inDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

describe('isBarred', () => {
  // AC-AL2 — on hold bars, batch or location.
  it('bars on-hold batches and on-hold locations', () => {
    expect(isBarred({ stockLineOnHold: true }, prefs())).toBe(true);
    expect(
      isBarred({ stockLineOnHold: false, location: { onHold: true } }, prefs())
    ).toBe(true);
    expect(isBarred({ stockLineOnHold: false }, prefs())).toBe(false);
  });

  // AC-AL2/AC-AL9 — unusable VVM bars only under the preference.
  it('bars unusable VVM only when the preference is on', () => {
    const batch = { stockLineOnHold: false, vvmStatus: { unusable: true } };
    expect(isBarred(batch, prefs())).toBe(false);
    expect(isBarred(batch, prefs({ manageVvmStatusForStock: true }))).toBe(
      true
    );
  });

  // AC-AL8 — the expired-issue guard bars within the threshold, gated by the
  // preference.
  it('bars expiry within the threshold only when the guard is on', () => {
    const soon = { stockLineOnHold: false, expiryDate: inDays(5) };
    const far = { stockLineOnHold: false, expiryDate: inDays(60) };
    expect(isBarred(soon, prefs())).toBe(false);
    const guard = prefs({
      expiredStockPreventIssue: true,
      expiredStockIssueThreshold: 30,
    });
    expect(isBarred(soon, guard)).toBe(true);
    expect(isBarred(far, guard)).toBe(false);
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

describe('lensToUnits', () => {
  // AC-AL7 — packs-of-‹size› converts; AC-AL6 — negatives distribute nothing.
  it('converts the packs lens and rejects negatives', () => {
    expect(lensToUnits(3, { kind: 'packs', size: 10 })).toBe(30);
    expect(lensToUnits(3, { kind: 'units' })).toBe(3);
    expect(lensToUnits(-1, { kind: 'units' })).toBeUndefined();
    expect(lensToUnits(null, { kind: 'units' })).toBeUndefined();
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
});

describe('deriveIssueWarnings', () => {
  // rules.md § reporting — every deviation reported, nothing narrows silently.
  it('reports over-allocation, shortfall (when consumed), and skips', () => {
    const distribution = {
      packsById: new Map<string, number>(),
      shortfallUnits: 4,
      overAllocatedUnits: 2,
      skippedBarred: true,
    };
    expect(
      deriveIssueWarnings(distribution, { reportShortfall: true }).map(
        warning => warning.kind
      )
    ).toEqual(['over-allocated', 'shortfall', 'skipped-barred']);
    expect(
      deriveIssueWarnings(distribution, { reportShortfall: false }).map(
        warning => warning.kind
      )
    ).toEqual(['over-allocated', 'skipped-barred']);
  });
});
