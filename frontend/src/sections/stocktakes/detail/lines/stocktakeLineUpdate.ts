import { graphqlFetch } from '@/api/graphql';
import {
  BatchStocktakeLines,
  type StocktakeLineFragment,
  type BatchStocktakeLinesVariables,
} from './stocktakeDetail.generated';
import type { LineErrors } from './stocktakeLineErrors';

// The stocktake-LINE batch layer — the ONE way to run the batchStocktake
// mutation (insert / update / delete in a single call) and read its per-line
// outcome. Both consumers go through it: the line-edit modal (all three kinds
// at once) and the detail view's selection actions (Delete / Change-location /
// Reduce-to-0, which use one kind each). Line-level, separate from
// stocktake-LEVEL edits (stocktakeUpdate.ts): a different mutation
// (batchStocktake vs updateStocktake), different result shapes, and line-error
// typenames from stocktakeLineErrors rather than the finalise/hold error map.

// What the batch mutation changed, applied in place by the caller with NO
// refetch (kdd/state- management): the server's own inserted/updated nodes
// (same StocktakeLineFragment as a detail row) plus the ids that were deleted.
// Partial success is normal — some lines commit while others error.
export type LineEditCommit = {
  inserted: StocktakeLineFragment[];
  updated: StocktakeLineFragment[];
  deletedIds: string[];
};

// The three input arrays, minus storeId (the caller passes that separately).
// Same shape the line editor's buildBatch produces and the selection actions
// assemble.
//
// `continueOnError` rides along as the per-call transaction choice (see the
// mutation in stocktakeDetail.graphql): the line editor leaves it unset so its
// insert+update+delete stays one atomic save, a bulk selection action sets it
// so each independent line stands or falls alone.
export type BatchStocktakeLinesInput = Omit<
  BatchStocktakeLinesVariables,
  'storeId'
>;

// The outcome of one batch call: what committed + which lines errored (by
// typename). `undefined` means the whole call failed at transport / NodeError
// level (already surfaced by the global modal), so there is nothing per-line to
// reflect.
export type BatchStocktakeLinesOutcome = {
  commit: LineEditCommit;
  errors: LineErrors;
};

// Run one batchStocktake mutation and partition every row's response — in a
// single pass per array — into the commit (success nodes / deleted ids) and the
// errors (lineId → error __typename, kept raw so the caller renders it: a
// column maps it to a message + cell, an action just notes the failure). Every
// per-line error is collected, not just the first.
export const runBatchStocktakeLines = async (
  storeId: string,
  input: BatchStocktakeLinesInput
): Promise<BatchStocktakeLinesOutcome | undefined> => {
  const result = await graphqlFetch(BatchStocktakeLines, { storeId, ...input });
  if (result.kind !== 'success') return undefined; // transport / NodeError → global modal showed it

  const batch = result.data.batchStocktake;
  const errors: LineErrors = new Map();

  const inserted: StocktakeLineFragment[] = [];
  for (const r of batch.insertStocktakeLines ?? []) {
    if (r.response.__typename === 'StocktakeLineNode')
      inserted.push(r.response);
    else errors.set(r.id, r.response.error.__typename);
  }

  const updated: StocktakeLineFragment[] = [];
  for (const r of batch.updateStocktakeLines ?? []) {
    if (r.response.__typename === 'StocktakeLineNode') updated.push(r.response);
    else errors.set(r.id, r.response.error.__typename);
  }

  const deletedIds: string[] = [];
  for (const r of batch.deleteStocktakeLines ?? []) {
    if (r.response.__typename === 'DeleteResponse') deletedIds.push(r.id);
    else errors.set(r.id, r.response.error.__typename);
  }

  return { commit: { inserted, updated, deletedIds }, errors };
};
