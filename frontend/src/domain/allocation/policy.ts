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

/**
 * A batch the store may not issue from: on hold (batch or location), unusable
 * VVM (under the preference), or expired within the guard threshold
 * (AC-AL2/AC-AL8).
 */
export const isBarred = (
  batch: BarrableBatch,
  prefs: AllocationPreferences
): boolean => {
  if (batch.stockLineOnHold || batch.location?.onHold) return true;
  if (batch.vvmStatus?.unusable && prefs.manageVvmStatusForStock) return true;
  if (prefs.expiredStockPreventIssue && batch.expiryDate) {
    const limit = new Date();
    limit.setDate(limit.getDate() + prefs.expiredStockIssueThreshold);
    if (new Date(batch.expiryDate) <= limit) return true;
  }
  return false;
};

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
