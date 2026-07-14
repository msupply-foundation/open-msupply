import { graphqlFetch } from '../../api/graphql';
import { t, type LocaleKey } from '../../intl';
import {
  BatchStocktakeLines,
  UpdateStocktake,
  type StocktakeInfoFragment,
  type StocktakeLineFragment,
  type BatchStocktakeLinesVariables,
  type UpdateStocktakeVariables,
} from './stocktakeDetail.generated';
import { stocktakeLineErrorMessage } from './stocktakeLineErrors';

// The one entry point for stocktake-LEVEL edits (the debounced field saves, the on-hold toggle,
// and Finalise). It wraps the updateStocktake mutation into a never-throwing discriminated result
// the view acts on directly (kdd/state-management), mirroring how the line editor consumes
// batchStocktake. A `saved` carries the SAME StocktakeInfo fragment the detail query read, so the
// caller splices it straight back with no refetch.
//
//  - `saved`  — the stocktake node after the edit.
//  - `error`  — the server rejected it (an UpdateStocktakeError). `message` is a friendly,
//               translated string; `lineIds` is the set of offending stocktake-line ids when the
//               error carries them (a snapshot/current-count mismatch), so the error-summary
//               dialog can offer "filter to just the error lines".
//  - `failed` — a transport / unexpected error; the global error modal has already shown it, so
//               the caller stays silent.
export type StocktakeUpdateResult =
  | { kind: 'saved'; node: StocktakeInfoFragment }
  | { kind: 'error'; typename: string; message: string; lineIds: string[] }
  | { kind: 'failed' };

// The finalise/on-hold error typenames (UpdateStocktakeErrorInterface implementers) → our own
// translated copy. An unmapped typename falls back to the server description (same convention as
// stocktakeLineErrors). Only the finalise path produces these — the plain field saves never fail
// this way on a NEW stocktake.
const ERROR_MESSAGE_KEYS: Record<string, LocaleKey> = {
  SnapshotCountCurrentCountMismatch: 'stocktake.update-error.snapshot-mismatch',
  StockLinesReducedBelowZero: 'stocktake.update-error.reduced-below-zero',
  StocktakeIsLocked: 'stocktake.update-error.is-locked',
  CannotEditStocktake: 'stocktake.update-error.cannot-edit',
};

const errorMessage = (typename: string, fallback: string): string => {
  const key = ERROR_MESSAGE_KEYS[typename];
  return key ? t(key) : fallback;
};

// Run a stocktake-level update. `input` is the UpdateStocktakeInput sans nothing — id + whichever
// fields changed (undefined fields are left untouched by the server).
export const runStocktakeUpdate = async (
  variables: UpdateStocktakeVariables,
): Promise<StocktakeUpdateResult> => {
  const result = await graphqlFetch(UpdateStocktake, variables);
  if (result.kind !== 'success') return { kind: 'failed' };

  const response = result.data.updateStocktake;
  if (response.__typename === 'StocktakeNode') {
    return { kind: 'saved', node: response };
  }

  // An UpdateStocktakeError. SnapshotCountCurrentCountMismatch carries the mismatched lines; the
  // other variants are stocktake-wide messages with no line detail ('lines' absent at runtime).
  const { error } = response;
  const lineIds = 'lines' in error ? error.lines.map((l) => l.stocktakeLine.id) : [];
  return {
    kind: 'error',
    typename: error.__typename,
    message: errorMessage(error.__typename, error.description),
    lineIds,
  };
};

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
