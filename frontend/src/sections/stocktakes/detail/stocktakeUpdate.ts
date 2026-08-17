import { graphqlFetch, type GraphqlErrorItem } from '@/api/graphql';
import { t, translateServerError, type LocaleKey } from '@/intl';
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
  // A truly-empty stocktake (zero lines). Verified live: this identifier can
  // arrive either as a typed UpdateStocktakeError member OR — on builds where
  // NoLines is not in the UpdateStocktakeErrorInterface union — as a top-level
  // rejection under extensions.details; both paths map through here so it reads
  // as an expected finalise error, never the global unexpected-error modal.
  NoLines: 'error.finalise-no-lines',
};

// Map a rejection identifier (typed __typename OR a top-level
// extensions.details variant name) to our own translated copy; `fallback` is
// the server's own text when we have no key for it.
const errorMessage = (identifier: string, fallback: string): string => {
  const key = ERROR_MESSAGE_KEYS[identifier];
  return key ? t(key) : fallback;
};

// A top-level (untyped) rejection carries the Rust variant name in
// `extensions.details` — the wire trap for finalise codes the union doesn't
// declare (spec/stocktakes/contract.md). Map it through the same keys so e.g.
// NoLines reads friendly, falling back to a sentence-cased form of the
// identifier, then the bare GraphQL message.
const untypedRejectionMessage = (errors: GraphqlErrorItem[]): string => {
  const detail = errors[0]?.extensions?.details;
  if (typeof detail === 'string' && detail.length > 0)
    return errorMessage(detail, translateServerError(detail));
  return errors[0]?.message ?? translateServerError('UnknownError');
};

// Finalise the stocktake (status → FINALISED). Unlike the field saves, its
// domain errors are surfaced to the user, so it returns the discriminated
// result rather than routing to the global modal. It opts into
// returnGraphqlErrors so a top-level (untyped) rejection — a finalise
// precondition the union doesn't declare, e.g. NoLines on some builds — is
// mapped to an expected `error` here instead of tripping the global
// unexpected-error modal.
export const finaliseStocktake = async (
  storeId: string,
  id: string
): Promise<StocktakeFinaliseResult> => {
  const result = await graphqlFetch(
    UpdateStocktake,
    { storeId, input: { id, status: 'FINALISED' } },
    { returnGraphqlErrors: true }
  );

  // A top-level rejection (extensions.details) — surface it in the finalise
  // modal, not the global one. No line ids to carry, so no "show error lines".
  if (result.kind === 'graphqlError') {
    return {
      kind: 'error',
      typename: 'GraphqlError',
      message: untypedRejectionMessage(result.errors),
      lineIds: [],
    };
  }
  if (result.kind !== 'success') return { kind: 'failed' };

  const response = result.data.updateStocktake;
  if (response.__typename === 'StocktakeNode') {
    return { kind: 'saved', node: response };
  }

  // A typed UpdateStocktakeError. SnapshotCountCurrentCountMismatch carries the
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
