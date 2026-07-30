import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
  type GraphqlErrorItem,
} from '../../../api/graphql';
import { t, type LocaleKey } from '../../../intl';
import {
  UpdateCustomerReturn,
  UpdateCustomerReturnLines,
  type CustomerReturnInfoFragment,
  type UpdateCustomerReturnVariables,
  type UpdateCustomerReturnLinesVariables,
  type UpdateCustomerReturnLinesResult,
} from './customerReturnDetail.generated';
import {
  DeleteCustomerReturn,
  InsertCustomerReturn,
  type InsertCustomerReturnVariables,
} from '../list/customerReturns.generated';

// Return-LEVEL mutations, split by how their errors are handled (the
// stocktakeUpdate convention):
//
// - saveReturnFields — header saves (reference / comment / colour / hold /
//   customer). On an editable return these don't produce a domain error the
//   user must act on — EXCEPT a customer change, whose two typed rejections
//   (not visible / not a customer) come back for inline display
//   (spec/customer-returns/contract.md § header rules). Anything else is
//   promoted to the global unexpected-error modal.
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
//   are dead schema — contract § deletion).

type UpdateReturnInput = UpdateCustomerReturnVariables['input'];

export type SaveReturnFieldsResult =
  | { kind: 'saved'; node: CustomerReturnInfoFragment }
  // The typed customer-change rejections, for inline display on the lookup.
  | { kind: 'error'; typename: string; message: string }
  | { kind: 'failed' };

const CUSTOMER_ERROR_KEYS: Record<string, LocaleKey> = {
  OtherPartyNotACustomer: 'error.other-party-not-a-customer',
  OtherPartyNotVisible: 'error.other-party-not-visible',
};

export const saveReturnFields = async (
  storeId: string,
  input: UpdateReturnInput
): Promise<SaveReturnFieldsResult> => {
  const result = await graphqlFetch(UpdateCustomerReturn, { storeId, input });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.updateCustomerReturn;
  if (response.__typename === 'InvoiceNode')
    return { kind: 'saved', node: response };
  const { error } = response;
  const key = CUSTOMER_ERROR_KEYS[error.__typename];
  return {
    kind: 'error',
    typename: error.__typename,
    message: key ? t(key) : error.description,
  };
};

// --- Status advance -------------------------------------------------------

// The non-typed rejection names the server puts in extensions.details
// (contract § advancing status — asserted by the AC tests against the real
// backend once probed; matching is by substring so a debug-formatted payload
// still resolves).
const ADVANCE_ERROR_KEYS: Record<string, LocaleKey> = {
  CannotIssueCustomerReturnWithNoLines: 'messages.no-lines',
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
  | { kind: 'saved'; node: CustomerReturnInfoFragment }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const advanceReturnStatus = async (
  storeId: string,
  id: string,
  status: 'RECEIVED' | 'VERIFIED',
  // Advancing may release the hold in the same change (rules § advancing
  // status — the same-request release; OMS-REG-DIST-07.34).
  onHold?: boolean
): Promise<AdvanceReturnResult> => {
  const result = await graphqlFetch(
    UpdateCustomerReturn,
    { storeId, input: { id, status, onHold } },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') {
    // A server-rejected write (e.g. missing mutate permission) surfaces through
    // the global permission-denied modal, not inline in the confirm dialog
    // (D38); returnGraphqlErrors suppressed the default routing, so route it here.
    if (isForbidden(result.errors)) {
      reportPermissionDenied(missingPermissions(result.errors));
      return { kind: 'failed' };
    }
    const key = matchDetails(result.errors);
    return { kind: 'error', message: key ? t(key) : result.message };
  }
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.updateCustomerReturn;
  if (response.__typename === 'InvoiceNode')
    return { kind: 'saved', node: response };
  // A typed error on a status advance is unexpected (the typed members are the
  // customer-change pair) — surface its description in the dialog.
  return { kind: 'error', message: response.error.description };
};

// --- Line save --------------------------------------------------------------

type ReturnWithLines = Extract<
  UpdateCustomerReturnLinesResult['updateCustomerReturnLines'],
  { __typename: 'InvoiceNode' }
>;

export type SaveReturnLinesResult =
  | { kind: 'saved'; node: ReturnWithLines }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const saveReturnLines = async (
  storeId: string,
  input: UpdateCustomerReturnLinesVariables['input']
): Promise<SaveReturnLinesResult> => {
  const result = await graphqlFetch(
    UpdateCustomerReturnLines,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') {
    // returnGraphqlErrors is on (to surface the non-typed line faults), which
    // suppresses the default Forbidden→modal routing — so route it here, like
    // delete/create below (a server-rejected write surfaces through the global
    // modal, never inline — D38).
    if (isForbidden(result.errors)) {
      reportPermissionDenied(missingPermissions(result.errors));
      return { kind: 'failed' };
    }
    return { kind: 'error', message: result.message };
  }
  if (result.kind !== 'success') return { kind: 'failed' };
  return { kind: 'saved', node: result.data.updateCustomerReturnLines };
};

// --- Delete -----------------------------------------------------------------

export type DeleteReturnResult =
  | { kind: 'deleted' }
  // The server rejected the write as Forbidden — the global permission-denied
  // modal has already been raised (D38); callers just stop, they don't
  // re-surface it.
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const deleteReturn = async (
  storeId: string,
  id: string
): Promise<DeleteReturnResult> => {
  const result = await graphqlFetch(
    DeleteCustomerReturn,
    { storeId, id },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') {
    // returnGraphqlErrors is on so the per-row bulk path can count failures —
    // but that opt-in also suppresses the default Forbidden→modal routing, so
    // route it here ourselves (rules § permission gates: server-rejected writes
    // surface through the global modal, never a toast/inline notice — D38).
    if (isForbidden(result.errors)) {
      reportPermissionDenied(missingPermissions(result.errors));
      return { kind: 'forbidden' };
    }
    return { kind: 'error', message: result.message };
  }
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.deleteCustomerReturn;
  if (response.__typename === 'DeleteResponse') return { kind: 'deleted' };
  return { kind: 'error', message: response.error.description };
};

// --- Create from an originating shipment ------------------------------------

// The from-shipment creation path (rules § creation — from an originating
// outbound shipment; OMS-REG-DIST-07.19–.22): insertCustomerReturn with outboundShipmentId
// set. The server records the originating shipment (InvoiceNode.originalShipment)
// and auto-advances the return to VERIFIED in the same transaction, so the
// response node is already terminal with its stock introduced (contract
// § creation — auto-verify). The two typed insert errors are the customer pair,
// which can't fire here (the customer comes from the shipment); every other
// rejection (cannot-return-unshipped, the all-zero whole-creation failure, …)
// is non-typed and surfaces in the modal — except Forbidden, which routes to
// the global permission-denied modal (D38), exactly as deleteReturn above.
export type CreateReturnResult =
  | { kind: 'created'; id: string }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const createReturnFromShipment = async (
  storeId: string,
  input: InsertCustomerReturnVariables['input']
): Promise<CreateReturnResult> => {
  const result = await graphqlFetch(
    InsertCustomerReturn,
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
  const response = result.data.insertCustomerReturn;
  if (response.__typename === 'InvoiceNode')
    return { kind: 'created', id: response.id };
  return { kind: 'error', message: response.error.description };
};
