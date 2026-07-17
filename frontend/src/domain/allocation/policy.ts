// The shared barred-batch policy and FEFO ordering
// (spec/stock-allocation/rules.md § barred batches, § ordering).
//
// Preferences arrive as plain values resolved by the consuming vertical — the
// policy owns no preference fetch (spec/stock-allocation/contract.md §
// preference fields), so any issue-side vertical can feed it from its own
// preferences query.

/** The preference values that shape barring (consumer-resolved). */
export interface AllocationPreferences {
  expiredStockPreventIssue: boolean;
  /** Days before expiry at which the expired-issue guard bars a batch. */
  expiredStockIssueThreshold: number;
  manageVvmStatusForStock: boolean;
}

/**
 * Why a batch is barred — the skip-category vocabulary shared by every
 * allocation report (spec/stock-allocation/contract.md § warning vocabulary).
 */
export type BarReason = 'on-hold' | 'expired' | 'unusable-vvm';

/**
 * The structural batch fields barring reads
 * (spec/stock-allocation/contract.md § the distributable batch) — a subset of
 * any server-computed draft-line shape, so no vertical's generated type leaks
 * in here.
 */
export interface BarrableBatch {
  stockLineOnHold: boolean;
  location?: { onHold: boolean } | null;
  vvmStatus?: { unusable: boolean } | null;
  expiryDate?: string | null;
}

/** Local calendar date as YYYY-MM-DD (the store clock's day). */
const localDay = (date: Date): string => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/**
 * Every bar category that applies to a batch (AC-AL2/AC-AL8/AC-AL9): on hold
 * (batch or location), expired within the guard threshold, unusable VVM
 * (under the preference). Empty result = usable.
 *
 * The expiry guard compares calendar DAYS (`today + threshold` vs the
 * expiry's date part), so the verdict is stable across the whole day rather
 * than flipping with the time of day the check happens to run.
 */
export const barReasons = (
  batch: BarrableBatch,
  prefs: AllocationPreferences,
  /** Injectable clock for deterministic tests; defaults to now. */
  today: Date = new Date()
): BarReason[] => {
  const reasons: BarReason[] = [];
  if (batch.stockLineOnHold || batch.location?.onHold) reasons.push('on-hold');
  if (prefs.expiredStockPreventIssue && batch.expiryDate) {
    const limit = new Date(today);
    limit.setDate(limit.getDate() + prefs.expiredStockIssueThreshold);
    if (batch.expiryDate.slice(0, 10) <= localDay(limit))
      reasons.push('expired');
  }
  if (batch.vvmStatus?.unusable && prefs.manageVvmStatusForStock)
    reasons.push('unusable-vvm');
  return reasons;
};

/** Convenience predicate over barReasons (grid row disabling, AC-AL8). */
export const isBarred = (
  batch: BarrableBatch,
  prefs: AllocationPreferences,
  today?: Date
): boolean => barReasons(batch, prefs, today).length > 0;

/**
 * FEFO display/fill order: earliest expiry first, no expiry last (AC-AL1).
 * The VVM-then-expiry preference variant is a consumer-side pre-sort layered
 * over this comparator.
 */
export const fefoCompare = (
  a: { expiryDate?: string | null },
  b: { expiryDate?: string | null }
): number => {
  if (!a.expiryDate) return b.expiryDate ? 1 : 0;
  if (!b.expiryDate) return -1;
  return a.expiryDate < b.expiryDate ? -1 : a.expiryDate > b.expiryDate ? 1 : 0;
};
