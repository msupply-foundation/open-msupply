import { t, type LocaleKey } from '@/intl';
import type { BatchStocktakeLinesResult } from './stocktakeDetail.generated';

// The concrete per-line error typenames the batchStocktake mutation can
// return, DERIVED from the generated result type — the query selects each error
// type as an inline fragment, so codegen narrows `error.__typename` to exactly
// the InsertStocktakeLineErrorInterface / Update / Delete implementers. Extract
// every response array's error member (the branch carrying `error`) and pull
// its `__typename`. Codegen-driven: adding an inline fragment to the query (or
// the schema growing a new error we then select) widens this union
// automatically — no hand-maintained list to drift.
//
// Placement has no central mapping: the columns that surface an error each
// render their own inline message, so which cell carries it lives at the
// column definition. (The line-wide CannotEditStocktake is intentionally not
// rendered on any cell — it's a whole-stocktake condition, and editing is
// already blocked when the stocktake is locked/finalised.) The words for a
// SUMMARY of a save are lineErrorCauses below.
type Batch = BatchStocktakeLinesResult['batchStocktake'];
type ResponseOf<A> =
  NonNullable<A> extends Array<{ response: infer R }> ? R : never;
type ErrorTypename<R> = R extends { error: { __typename: infer T } }
  ? T
  : never;
export type LineErrorTypename =
  | ErrorTypename<ResponseOf<Batch['insertStocktakeLines']>>
  | ErrorTypename<ResponseOf<Batch['updateStocktakeLines']>>
  | ErrorTypename<ResponseOf<Batch['deleteStocktakeLines']>>;

// The per-line errors from one batch mutation, keyed by line id → the error's
// __typename (kept raw, not pre-rendered). Shared by both consumers: the edit
// modal + detail view render it per-column, the selection actions just note
// which lines failed.
export type LineErrors = Map<string, LineErrorTypename>;

// What went wrong and what to do about it, for each error. The snapshot
// mismatch and the below-zero count use the same words as their cells.
const CAUSE_KEYS: Record<LineErrorTypename, LocaleKey> = {
  SnapshotCountCurrentCountMismatchLine: 'error.snapshot-total-mismatch',
  StockLineReducedBelowZero: 'error.reduced-below-zero',
  AdjustmentReasonNotProvided: 'stocktake.line-error.reason-not-provided',
  AdjustmentReasonNotValid: 'error.provide-valid-reason',
  CannotEditStocktake: 'stocktake.line-error.cannot-edit',
};

// One sentence per distinct cause behind a save's refused lines, in the order
// first met, for the summary beside the "N lines have errors" count.
//
// Why an error is never left to the field it's about alone (#2099,
// OMS-REG-INV-03.99): that field can be out of view — Snapshot is omitted
// under blind stocktake, and any column can be hidden — and then a bare count
// gives no way forward. So the summary states each cause, the line's whole
// row or card is marked, and the detail table repeats the words under Counted,
// the one column that can't be hidden. Those places point back here.
export const lineErrorCauses = (
  errors: Iterable<LineErrorTypename>
): string[] => [...new Set([...errors].map(error => t(CAUSE_KEYS[error])))];

// The same error in a few words, for under a field in a table cell or on a
// card, where the full cause doesn't fit. A summary beside it gives the rest.
const SHORT_MESSAGE_KEYS: Record<LineErrorTypename, LocaleKey> = {
  SnapshotCountCurrentCountMismatchLine: 'stocktake.line-error.stock-changed',
  StockLineReducedBelowZero: 'stocktake.line-error.stock-reserved',
  AdjustmentReasonNotProvided: 'stocktake.line-error.reason-not-provided',
  // The editor's Reason field says the same.
  AdjustmentReasonNotValid: 'error.provide-valid-reason',
  CannotEditStocktake: 'stocktake.line-error.cannot-edit',
};

export const lineErrorShortMessage = (error: LineErrorTypename): string =>
  t(SHORT_MESSAGE_KEYS[error]);
