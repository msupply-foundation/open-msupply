import { t, type LocaleKey } from '../../intl';
import { exhaustiveCheck } from '../../typeHelpers';
import type { BatchStocktakeLinesResult } from './stocktakeDetail.generated';

// Structured stocktake-line errors → friendly, translated messages (mirrors Open mSupply's
// stocktakeLineErrorMessageKey). The batchStocktake mutation returns, per line, an error whose
// `__typename` is one of these concrete types; we map that to our own message rather than showing
// the server's raw English `description`.
//
// The union is DERIVED from the generated result type — the batchStocktakeLines query selects each
// concrete error type as an inline fragment, so codegen narrows `error.__typename` to exactly the
// InsertStocktakeLineErrorInterface / Update / Delete implementers. Extract every response array's
// error member (the branch carrying `error`) and pull its `__typename`. Because it's codegen-
// driven, adding an inline fragment to the query (or the schema growing a new error we then select)
// widens this union → the Record below and the field switch's exhaustiveCheck stop compiling until
// the new case is handled. No hand-maintained list to drift.
type Batch = BatchStocktakeLinesResult['batchStocktake'];
type ResponseOf<A> = NonNullable<A> extends Array<{ response: infer R }> ? R : never;
type ErrorTypename<R> = R extends { error: { __typename: infer T } } ? T : never;
export type LineErrorTypename =
  | ErrorTypename<ResponseOf<Batch['insertStocktakeLines']>>
  | ErrorTypename<ResponseOf<Batch['updateStocktakeLines']>>
  | ErrorTypename<ResponseOf<Batch['deleteStocktakeLines']>>;

// The per-line errors from one batch mutation, keyed by line id → the error's __typename (kept
// raw, not pre-rendered). Both consumers share this: the edit modal reads it per-column (message +
// which cell to mark), the selection actions just note which lines failed. The value is the plain
// typename string — an unmodelled one still round-trips and renders via the server-description
// fallback in stocktakeLineErrorMessage.
export type LineErrors = Map<string, string>;

const LINE_ERROR_MESSAGE_KEYS: Record<LineErrorTypename, LocaleKey> = {
  StockLineReducedBelowZero: 'stocktake.line-error.reduced-below-zero',
  AdjustmentReasonNotProvided: 'stocktake.line-error.reason-not-provided',
  AdjustmentReasonNotValid: 'stocktake.line-error.reason-not-valid',
  SnapshotCountCurrentCountMismatchLine: 'stocktake.line-error.snapshot-mismatch',
  CannotEditStocktake: 'stocktake.line-error.cannot-edit',
};

const isLineErrorTypename = (typename: string): typename is LineErrorTypename =>
  typename in LINE_ERROR_MESSAGE_KEYS;

// The translated message for a line error. `typename` is the response error's __typename (a plain
// string); an unmapped typename (e.g. a schema error we don't model yet) falls back to the server
// description.
export const stocktakeLineErrorMessage = (typename: string, fallback: string): string =>
  isLineErrorTypename(typename) ? t(LINE_ERROR_MESSAGE_KEYS[typename]) : fallback;

// The fields a line error touches, so the editor can highlight the offending input. A snapshot
// mismatch is about the snapshot vs the current count; below-zero is about the counted quantity;
// a missing/invalid reason is about the reason picker. Used to mark cells + steer the user.
export type LineErrorField = 'counted' | 'snapshot' | 'reason';

export const stocktakeLineErrorField = (typename: string): LineErrorField | undefined => {
  // Unknown typenames (not a modelled line error) anchor nowhere specific.
  if (!isLineErrorTypename(typename)) return undefined;
  // Exhaustive over LineErrorTypename: a new member added above stops compiling here until it's
  // given a field (CannotEditStocktake is line-wide, so it has no single field → undefined).
  switch (typename) {
    case 'StockLineReducedBelowZero':
      return 'counted';
    case 'SnapshotCountCurrentCountMismatchLine':
      return 'snapshot';
    case 'AdjustmentReasonNotProvided':
    case 'AdjustmentReasonNotValid':
      return 'reason';
    case 'CannotEditStocktake':
      return undefined;
    default:
      return exhaustiveCheck(typename);
  }
};
