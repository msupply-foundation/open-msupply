import type { TFunction } from 'i18next';
import type { TxKey } from '@/intl';

// Server error __typename -> message key. Shared by the inline grid and the
// per-item line-edit modal so both surface the same friendly messages.
export const ERROR_KEYS: Record<string, TxKey> = {
  AdjustmentReasonNotProvided: 'error.adjustment-reason-not-provided',
  AdjustmentReasonNotValid: 'error.adjustment-reason-not-valid',
  StockLineReducedBelowZero: 'error.stock-below-zero',
  SnapshotCountCurrentCountMismatchLine: 'error.snapshot-mismatch',
  CannotEditStocktake: 'error.cannot-edit-stocktake',
};

export type ErrorField = 'reason' | 'counted' | 'snapshot' | 'row';

// Which input a given server error should highlight.
export function errorField(typename: string): ErrorField {
  switch (typename) {
    case 'AdjustmentReasonNotProvided':
    case 'AdjustmentReasonNotValid':
      return 'reason';
    case 'StockLineReducedBelowZero':
      return 'counted';
    case 'SnapshotCountCurrentCountMismatchLine':
      return 'snapshot';
    default:
      return 'row';
  }
}

export function errorMessage(
  t: TFunction,
  typename: string,
  fallback: string,
): string {
  const key = ERROR_KEYS[typename];
  return key ? t(key) : fallback;
}

// A reason is only relevant (and only required by the server) when the counted
// amount differs from the snapshot.
export function adjustmentDirection(
  countedRaw: string,
  snapshot: number,
): 'positive' | 'negative' | null {
  if (countedRaw === '') return null;
  const n = Number(countedRaw);
  if (Number.isNaN(n) || n === snapshot) return null;
  return n > snapshot ? 'positive' : 'negative';
}
