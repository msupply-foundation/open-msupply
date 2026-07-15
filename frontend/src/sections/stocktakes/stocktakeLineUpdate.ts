import { graphqlFetch } from '../../api/graphql';
import {
  BatchStocktakeLines,
  type StocktakeLineFragment,
  type BatchStocktakeLinesVariables,
} from './stocktakeDetail.generated';
import { stocktakeLineErrorMessage } from './stocktakeLineErrors';

// The stocktake-LINE bulk operations — the detail view's selection actions (Delete, Change-location,
// Reduce-to-0). These wrap the batchStocktake mutation into never-throwing discriminated results the
// view acts on directly (kdd/state-management). Line-level, and separate from stocktake-LEVEL edits
// (stocktakeUpdate.ts): a different mutation (batchStocktake vs updateStocktake), different result
// shapes, and line-error copy from stocktakeLineErrors rather than the finalise/hold error map. The
// line-edit modal drives batchStocktake on its own path (its inline buildBatch) — these are only the
// bulk selection actions.

// A bulk line delete (a selection action). Returns which ids actually deleted plus, if any line
// couldn't be deleted, an `error` describing the failed lines (for the error-summary dialog — the
// failed ids become the "show error lines" filter). Deletes are otherwise applied in place by the
// caller with no refetch.
export type StocktakeLinesDeleteResult =
  | { kind: 'deleted'; deletedIds: string[] }
  | { kind: 'partial'; deletedIds: string[]; error: { message: string; lineIds: string[] } }
  | { kind: 'failed' };

export const deleteStocktakeLines = async (
  storeId: string,
  ids: string[],
): Promise<StocktakeLinesDeleteResult> => {
  const result = await graphqlFetch(BatchStocktakeLines, {
    storeId,
    delete: ids.map((id) => ({ id })),
  });
  if (result.kind !== 'success') return { kind: 'failed' };

  const responses = result.data.batchStocktake.deleteStocktakeLines ?? [];
  const deletedIds: string[] = [];
  const failedIds: string[] = [];
  let message = '';
  for (const r of responses) {
    if (r.response.__typename === 'DeleteResponse') {
      deletedIds.push(r.id);
    } else if ('error' in r.response) {
      failedIds.push(r.id);
      message = stocktakeLineErrorMessage(r.response.error.__typename, r.response.error.description);
    }
  }

  if (failedIds.length > 0) {
    return { kind: 'partial', deletedIds, error: { message, lineIds: failedIds } };
  }
  return { kind: 'deleted', deletedIds };
};

// A bulk line UPDATE (the selection actions Change-location and Reduce-to-0). The caller supplies
// the per-line patches (same UpdateStocktakeLineInput shape the line editor uses); success returns
// the updated StocktakeLine fragments (spliced back in place, no refetch), and any line that fails
// becomes the error dialog's "show error lines" set. Change-location sets location:{value:id};
// Reduce-to-0 sets countedNumberOfPacks: 0.
type LineUpdateInput = NonNullable<BatchStocktakeLinesVariables['update']>[number];

export type StocktakeLinesUpdateResult =
  | { kind: 'updated'; updated: StocktakeLineFragment[] }
  | { kind: 'partial'; updated: StocktakeLineFragment[]; error: { message: string; lineIds: string[] } }
  | { kind: 'failed' };

export const updateStocktakeLines = async (
  storeId: string,
  updates: LineUpdateInput[],
): Promise<StocktakeLinesUpdateResult> => {
  const result = await graphqlFetch(BatchStocktakeLines, { storeId, update: updates });
  if (result.kind !== 'success') return { kind: 'failed' };

  const responses = result.data.batchStocktake.updateStocktakeLines ?? [];
  const updated: StocktakeLineFragment[] = [];
  const failedIds: string[] = [];
  let message = '';
  for (const r of responses) {
    if (r.response.__typename === 'StocktakeLineNode') {
      updated.push(r.response);
    } else if ('error' in r.response) {
      failedIds.push(r.id);
      message = stocktakeLineErrorMessage(r.response.error.__typename, r.response.error.description);
    }
  }

  if (failedIds.length > 0) {
    return { kind: 'partial', updated, error: { message, lineIds: failedIds } };
  }
  return { kind: 'updated', updated };
};
