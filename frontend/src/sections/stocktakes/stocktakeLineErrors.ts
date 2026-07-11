import { t, type LocaleKey } from '../../intl';

// Structured stocktake-line errors → friendly, translated messages (mirrors Open mSupply's
// stocktakeLineErrorMessageKey). The batchStocktake mutation returns, per line, an error whose
// `__typename` is one of these concrete types; we map that to our own message rather than showing
// the server's raw English `description`. An unmapped typename falls back to the server text.
//
// The typenames come from the schema's InsertStocktakeLineErrorInterface /
// UpdateStocktakeLineErrorInterface / DeleteStocktakeLineErrorInterface implementers.
const ERROR_MESSAGE_KEYS: Record<string, LocaleKey> = {
  StockLineReducedBelowZero: 'stocktake.line-error.reduced-below-zero',
  AdjustmentReasonNotProvided: 'stocktake.line-error.reason-not-provided',
  AdjustmentReasonNotValid: 'stocktake.line-error.reason-not-valid',
  SnapshotCountCurrentCountMismatchLine: 'stocktake.line-error.snapshot-mismatch',
  CannotEditStocktake: 'stocktake.line-error.cannot-edit',
};

// The translated message for a line error. `typename` is the response error's __typename;
// `fallback` is the server description, shown when we have no mapping for that typename.
export const stocktakeLineErrorMessage = (typename: string, fallback: string): string => {
  const key = ERROR_MESSAGE_KEYS[typename];
  return key ? t(key) : fallback;
};

// The fields a line error touches, so the editor can highlight the offending input. A snapshot
// mismatch is about the snapshot vs the current count; below-zero is about the counted quantity;
// a missing/invalid reason is about the reason picker. Used to mark cells + steer the user.
export type LineErrorField = 'counted' | 'snapshot' | 'reason';

export const stocktakeLineErrorField = (typename: string): LineErrorField | undefined => {
  switch (typename) {
    case 'StockLineReducedBelowZero':
      return 'counted';
    case 'SnapshotCountCurrentCountMismatchLine':
      return 'snapshot';
    case 'AdjustmentReasonNotProvided':
    case 'AdjustmentReasonNotValid':
      return 'reason';
    default:
      return undefined;
  }
};
