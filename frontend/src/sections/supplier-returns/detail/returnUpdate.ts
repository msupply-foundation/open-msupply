import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
  type GraphqlErrorItem,
} from '../../../api/graphql';
import { t, type LocaleKey } from '../../../intl';
import {
  UpdateSupplierReturn,
  UpdateSupplierReturnLines,
  UpdateSupplierReturnOtherParty,
  type SupplierReturnInfoFragment,
  type UpdateSupplierReturnVariables,
  type UpdateSupplierReturnLinesVariables,
  type UpdateSupplierReturnLinesResult,
  type UpdateSupplierReturnOtherPartyVariables,
} from './supplierReturnDetail.generated';
import {
  DeleteSupplierReturn,
  InsertSupplierReturn,
  type InsertSupplierReturnVariables,
} from '../list/supplierReturns.generated';

// Return-LEVEL mutations, split by how their errors are handled (the
// customer-returns / stocktakeUpdate convention):
//
// - saveReturnFields — header saves (reference / transport reference /
//   comment / colour / hold / custom fields). UpdateSupplierReturnResponse is
//   a single-member union (InvoiceNode) — there is NO typed error to display;
//   an editable return produces none the user must act on, so anything
//   unexpected is promoted to the global modal (default graphqlFetch routing).
//   Changing the supplier is a SEPARATE, typed mutation (changeSupplier,
//   below).
//
// - changeSupplier — updateSupplierReturnOtherParty. The service
//   delete-and-recreates the return under a NEW id (contract § changing the
//   supplier), so success returns the new node to navigate to. Its four typed
//   rejections come back for inline display on the supplier lookup.
//
// - advanceReturnStatus — the action with user-facing rejections. Every one is
//   a NON-typed GraphQL error (contract § advancing status): we opt in via
//   returnGraphqlErrors and map extensions.details to translated copy.
//
// - saveReturnLines — the one line-save call. Its response union has NO error
//   member (contract wire trap): every rejection is a non-typed GraphQL error,
//   surfaced as a message in the modal.
//
// - deleteReturn — all rejections non-typed (the three declared typed members
//   are dead schema — contract § deletion). Forbidden routes to the global
//   modal.

// --- Header save (no typed error) ------------------------------------------

type UpdateReturnInput = UpdateSupplierReturnVariables['input'];

export type SaveReturnFieldsResult =
  { kind: 'saved'; node: SupplierReturnInfoFragment } | { kind: 'failed' };

export const saveReturnFields = async (
  storeId: string,
  input: UpdateReturnInput
): Promise<SaveReturnFieldsResult> => {
  const result = await graphqlFetch(UpdateSupplierReturn, { storeId, input });
  if (result.kind !== 'success') return { kind: 'failed' };
  return { kind: 'saved', node: result.data.updateSupplierReturn };
};

// --- Change supplier (typed, delete-and-recreate) --------------------------

const OTHER_PARTY_ERROR_KEYS: Record<string, LocaleKey> = {
  OtherPartyNotASupplier: 'error.other-party-not-a-supplier',
  OtherPartyNotVisible: 'error.other-party-not-visible',
  InvoiceIsNotEditable: 'error.not-editable',
  RecordNotFound: 'error.return-not-found',
};

export type ChangeSupplierResult =
  // The new return's id — the UI navigates to it (the old id no
  // longer resolves).
  | { kind: 'saved'; node: SupplierReturnInfoFragment }
  | { kind: 'error'; typename: string; message: string }
  | { kind: 'failed' };

export const changeSupplier = async (
  storeId: string,
  input: UpdateSupplierReturnOtherPartyVariables['input']
): Promise<ChangeSupplierResult> => {
  const result = await graphqlFetch(UpdateSupplierReturnOtherParty, {
    storeId,
    input,
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.updateSupplierReturnOtherParty;
  if (response.__typename === 'InvoiceNode')
    return { kind: 'saved', node: response };
  const { error } = response;
  const key = OTHER_PARTY_ERROR_KEYS[error.__typename];
  return {
    kind: 'error',
    typename: error.__typename,
    message: key ? t(key) : error.description,
  };
};

// --- Status advance ---------------------------------------------------------

// The non-typed rejection names the server puts in extensions.details
// (contract § advancing status — matched by substring so a debug-formatted
// payload still resolves).
const ADVANCE_ERROR_KEYS: Record<string, LocaleKey> = {
  CannotIssueSupplierReturnWithNoLines: 'messages.no-lines',
  CannotChangeStatusOfInvoiceOnHold: 'messages.status-blocked-on-hold',
  ReturnIsNotEditable: 'error.not-editable',
  CannotReverseInvoiceStatus: 'error.not-editable',
};

const matchDetails = (errors: GraphqlErrorItem[]): LocaleKey | undefined => {
  for (const e of errors) {
    const details = e.extensions?.details;
    if (typeof details !== 'string') continue;
    for (const [name, key] of Object.entries(ADVANCE_ERROR_KEYS)) {
      if (details.includes(name)) return key;
    }
  }
  return undefined;
};

export type AdvanceReturnResult =
  | { kind: 'saved'; node: SupplierReturnInfoFragment }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const advanceReturnStatus = async (
  storeId: string,
  id: string,
  status: 'PICKED' | 'SHIPPED',
  // Advancing may release the hold in the same change (rules § advancing status
  // — the same-request release; REPL-06 .35).
  onHold?: boolean
): Promise<AdvanceReturnResult> => {
  const result = await graphqlFetch(
    UpdateSupplierReturn,
    { storeId, input: { id, status, onHold } },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') {
    // A server-rejected write (e.g. missing mutate permission) surfaces through
    // the global permission-denied modal, not inline in the confirm dialog
    // (rules § permission gates — D38); returnGraphqlErrors suppressed the
    // default routing, so route it here.
    if (isForbidden(result.errors)) {
      reportPermissionDenied(missingPermissions(result.errors));
      return { kind: 'failed' };
    }
    const key = matchDetails(result.errors);
    return { kind: 'error', message: key ? t(key) : result.message };
  }
  if (result.kind !== 'success') return { kind: 'failed' };
  return { kind: 'saved', node: result.data.updateSupplierReturn };
};

// --- Line save --------------------------------------------------------------

type ReturnWithLines = Extract<
  UpdateSupplierReturnLinesResult['updateSupplierReturnLines'],
  { __typename: 'InvoiceNode' }
>;

export type SaveReturnLinesResult =
  | { kind: 'saved'; node: ReturnWithLines }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const saveReturnLines = async (
  storeId: string,
  input: UpdateSupplierReturnLinesVariables['input']
): Promise<SaveReturnLinesResult> => {
  const result = await graphqlFetch(
    UpdateSupplierReturnLines,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') {
    // returnGraphqlErrors is on (to surface the non-typed line faults), which
    // suppresses the default Forbidden→modal routing — so route it here, like
    // delete/create below (rules § permission gates: a server-rejected write
    // surfaces through the global modal, never inline — D38).
    if (isForbidden(result.errors)) {
      reportPermissionDenied(missingPermissions(result.errors));
      return { kind: 'failed' };
    }
    return { kind: 'error', message: result.message };
  }
  if (result.kind !== 'success') return { kind: 'failed' };
  return { kind: 'saved', node: result.data.updateSupplierReturnLines };
};

// --- Delete -----------------------------------------------------------------

export type DeleteReturnResult =
  | { kind: 'deleted' }
  // The server rejected the write as Forbidden — the global permission-denied
  // modal has already been raised (D38); callers just stop.
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const deleteReturn = async (
  storeId: string,
  id: string
): Promise<DeleteReturnResult> => {
  const result = await graphqlFetch(
    DeleteSupplierReturn,
    { storeId, id },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') {
    // returnGraphqlErrors is on so the per-row bulk path can count failures —
    // but that opt-in also suppresses the default Forbidden→modal routing, so
    // route it here ourselves (rules § permission gates — D38).
    if (isForbidden(result.errors)) {
      reportPermissionDenied(missingPermissions(result.errors));
      return { kind: 'forbidden' };
    }
    return { kind: 'error', message: result.message };
  }
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.deleteSupplierReturn;
  if (response.__typename === 'DeleteResponse') return { kind: 'deleted' };
  return { kind: 'error', message: response.error.description };
};

// --- Create from an originating inbound shipment ----------------------------

// The from-shipment creation path (rules § creation — from an originating
// inbound shipment; REPL-06 .1/.28): insertSupplierReturn with
// inboundShipmentId set. The server records the originating shipment
// (InvoiceNode.originalShipment) and auto-advances the return to SHIPPED in the
// same transaction, so the response node is already terminal with its stock
// issued (contract § creation — auto-ship). The entry point lives in
// inbound-shipments; this is the wiring for it. The two typed insert errors are
// the supplier pair, which can't fire here (the supplier comes from the
// shipment); every other rejection is non-typed and surfaces in the modal —
// except Forbidden, which routes to the global modal (D38), exactly as
// deleteReturn above.
export type CreateReturnResult =
  | { kind: 'created'; id: string }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const createReturnFromShipment = async (
  storeId: string,
  input: InsertSupplierReturnVariables['input']
): Promise<CreateReturnResult> => {
  const result = await graphqlFetch(
    InsertSupplierReturn,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') {
    if (isForbidden(result.errors)) {
      reportPermissionDenied(missingPermissions(result.errors));
      return { kind: 'forbidden' };
    }
    return { kind: 'error', message: result.message };
  }
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.insertSupplierReturn;
  if (response.__typename === 'InvoiceNode')
    return { kind: 'created', id: response.id };
  return { kind: 'error', message: response.error.description };
};
