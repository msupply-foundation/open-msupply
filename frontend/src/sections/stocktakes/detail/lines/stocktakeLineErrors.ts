import type { BatchStocktakeLinesResult } from './stocktakeDetail.generated';

// The concrete per-line error typenames the batchStocktake mutation can return, DERIVED from the
// generated result type — the query selects each error type as an inline fragment, so codegen
// narrows `error.__typename` to exactly the InsertStocktakeLineErrorInterface / Update / Delete
// implementers. Extract every response array's error member (the branch carrying `error`) and pull
// its `__typename`. Codegen-driven: adding an inline fragment to the query (or the schema growing a
// new error we then select) widens this union automatically — no hand-maintained list to drift.
//
// There is NO central typename → message or typename → field mapping: the columns that surface an
// error each render their own inline <Show when={lineErrors[id] === 'ThatTypename'}> with the t()
// message, so both the placement (which cell) and the copy live at the column definition. (The
// line-wide CannotEditStocktake is intentionally not rendered on any cell — it's a whole-stocktake
// condition, and editing is already blocked when the stocktake is locked/finalised.)
type Batch = BatchStocktakeLinesResult['batchStocktake'];
type ResponseOf<A> = NonNullable<A> extends Array<{ response: infer R }> ? R : never;
type ErrorTypename<R> = R extends { error: { __typename: infer T } } ? T : never;
export type LineErrorTypename =
  | ErrorTypename<ResponseOf<Batch['insertStocktakeLines']>>
  | ErrorTypename<ResponseOf<Batch['updateStocktakeLines']>>
  | ErrorTypename<ResponseOf<Batch['deleteStocktakeLines']>>;

// The per-line errors from one batch mutation, keyed by line id → the error's __typename (kept raw,
// not pre-rendered). Shared by both consumers: the edit modal + detail view render it per-column,
// the selection actions just note which lines failed.
export type LineErrors = Map<string, LineErrorTypename>;
