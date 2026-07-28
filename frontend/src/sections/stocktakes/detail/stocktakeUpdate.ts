import { graphqlFetch } from '@/api/graphql';
import { t, type LocaleKey } from '@/intl';
import {
  UpdateStocktake,
  type StocktakeInfoFragment,
  type UpdateStocktakeVariables,
} from './lines/stocktakeDetail.generated';

// Stocktake-LEVEL edits via the updateStocktake mutation, split by how their
// errors are handled — because the two callers are genuinely different
// (kdd/state-management):
//
// - saveStocktakeFields — the as-you-type field saves (description / comment /
// counted-by / verified-by) AND the on-hold toggle. On a NEW, non-locked
// stocktake these don't produce a domain error the user must act on; the UI
// already disables the fields once the stocktake is finalised/locked, so a
// CannotEditStocktake here would be an unexpected race. So ANY server rejection
// is routed to the GLOBAL unexpected-error modal (via mapSuccessToError) — no
// local error plumbing, no line-id mapping. A save returns the fresh node
// (spliced back, no refetch).
//
// - finaliseStocktake — the ACTION with rich, user-facing errors. Finalise is
// the only update that validates finalise-time invariants and can come back
// SnapshotCountCurrentCountMismatch carrying the offending line ids
// (spec/stocktakes/contract.md), which the view surfaces in the error dialog
// with "show error lines". So it keeps the discriminated error result + message
// mapping.
//
// Line-level bulk ops (Delete / Change-location / Reduce-to-0) live in
// stocktakeLineUpdate.ts — a different mutation (batchStocktake) with its own
// error source.

type UpdateStocktakeInput = UpdateStocktakeVariables['input'];

// --- Field / on-hold saves — errors go global
// ------------------------------------------------

// Save whichever stocktake fields changed. `input` is id + the changed fields
// (undefined fields are left untouched by the server). Returns the saved node,
// or undefined when the fetch failed OR the server rejected it — in the reject
// case mapSuccessToError has already promoted it to the global error modal, so
// the caller just stays put. There is deliberately no error branch here.
export const saveStocktakeFields = async (
  storeId: string,
  input: UpdateStocktakeInput
): Promise<StocktakeInfoFragment | undefined> => {
  const result = await graphqlFetch(
    UpdateStocktake,
    { storeId, input },
    {
      // An UpdateStocktakeError on a plain field save is unexpected (the UI
      // guards the disabled case) → promote its description to the global
      // unexpected-error modal.
      mapSuccessToError: data =>
        data.updateStocktake.__typename === 'UpdateStocktakeError'
          ? data.updateStocktake.error.description
          : undefined,
    }
  );
  if (result.kind !== 'success') return undefined;
  const response = result.data.updateStocktake;
  return response.__typename === 'StocktakeNode' ? response : undefined;
};

// --- Finalise — the action with user-facing domain errors
// ------------------------------------

//  - `saved`  — the stocktake node after finalising.
// - `error`  — the server rejected finalise (an UpdateStocktakeError).
// `message` is a friendly, translated string; `lineIds` is the offending
// stocktake-line ids when the error carries them (the snapshot/current-count
// mismatch), so the error-summary dialog can offer "filter to just the error
// lines". - `failed` — a transport / unexpected error; the global error modal
// has already shown it, so the caller stays silent.
export type StocktakeFinaliseResult =
  | { kind: 'saved'; node: StocktakeInfoFragment }
  | { kind: 'error'; typename: string; message: string; lineIds: string[] }
  | { kind: 'failed' };

// The finalise error typenames (UpdateStocktakeErrorInterface implementers) →
// our own translated copy. An unmapped typename falls back to the server
// description (same convention as stocktakeLineErrors).
const ERROR_MESSAGE_KEYS: Record<string, LocaleKey> = {
  SnapshotCountCurrentCountMismatch: 'error.finalise-snapshot-mismatch',
  StockLinesReducedBelowZero: 'error.finalise-reduced-below-zero',
  StocktakeIsLocked: 'error.is-locked',
  CannotEditStocktake: 'error.not-editable',
};

const errorMessage = (typename: string, fallback: string): string => {
  const key = ERROR_MESSAGE_KEYS[typename];
  return key ? t(key) : fallback;
};

// Finalise the stocktake (status → FINALISED). Unlike the field saves, its
// domain errors are surfaced to the user, so it returns the discriminated
// result rather than routing to the global modal.
export const finaliseStocktake = async (
  storeId: string,
  id: string
): Promise<StocktakeFinaliseResult> => {
  const result = await graphqlFetch(UpdateStocktake, {
    storeId,
    input: { id, status: 'FINALISED' },
  });
  if (result.kind !== 'success') return { kind: 'failed' };

  const response = result.data.updateStocktake;
  if (response.__typename === 'StocktakeNode') {
    return { kind: 'saved', node: response };
  }

  // An UpdateStocktakeError. SnapshotCountCurrentCountMismatch carries the
  // mismatched lines; the other variants are stocktake-wide messages with no
  // line detail ('lines' absent at runtime).
  const { error } = response;
  const lineIds =
    'lines' in error ? error.lines.map(l => l.stocktakeLine.id) : [];
  return {
    kind: 'error',
    typename: error.__typename,
    message: errorMessage(error.__typename, error.description),
    lineIds,
  };
};
