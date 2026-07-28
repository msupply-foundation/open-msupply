import { graphqlFetch } from '../../../api/graphql';
import { t, type LocaleKey } from '../../../intl';
import {
  UpdateInternalOrder,
  RefreshAncillaryItems,
  UseSuggestedQuantities,
  type InternalOrderInfoFragment,
  type UpdateInternalOrderVariables,
  type RefreshAncillaryItemsVariables,
} from './internalOrderDetail.generated';
import { DeleteInternalOrders } from '../list/internalOrders.generated';
import { AddInternalOrderFromMasterList } from './edit-modal/masterList.generated';

// Order-LEVEL mutations for the detail screen, split by how their errors are
// handled (the returnUpdate / stocktakeUpdate convention).
//
// - saveInternalOrderFields — header saves (reference / comment / colour /
//   supplier / destination / MOS thresholds). On an editable Draft these don't
//   produce a domain error the user must act on EXCEPT a supplier change, whose
//   typed rejections come back for inline display on the lookup (contract ›
//   header fields). Anything else is promoted to the global unexpected-error
//   modal (graphqlFetch's default).
//
// - sendInternalOrder — the send (status = SENT). Its user-facing refusals are
//   TYPED members of the update error union (contract › lifecycle / emergency
//   orders / editing lines): the reasons backstop, the emergency cap, and
//   cannot-edit. A missing RequisitionSend permission comes back as a plain
//   Forbidden GraphQL error, which graphqlFetch routes to the global
//   permission-denied modal (we don't set returnGraphqlErrors, so that default
//   holds).
//
// Line mutations (add / edit / delete) are the line-editor slice (S4), out of
// this cut — the detail line table is read-only here.

type UpdateInput = UpdateInternalOrderVariables['input'];

// Typed supplier-change rejections → inline copy on the lookup (contract ›
// header fields; the destination-customer errors wear the same supplier types).
const SUPPLIER_ERROR_KEYS: Record<string, LocaleKey> = {
  OtherPartyNotASupplier: 'error.other-party-not-a-supplier',
  OtherPartyNotVisible: 'error.other-party-not-visible',
  OtherPartyNotACustomer: 'error.other-party-not-a-customer',
};

export type SaveFieldsResult =
  | { kind: 'saved'; node: InternalOrderInfoFragment }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const saveInternalOrderFields = async (
  storeId: string,
  input: UpdateInput
): Promise<SaveFieldsResult> => {
  const result = await graphqlFetch(UpdateInternalOrder, { storeId, input });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.updateRequestRequisition;
  if (response.__typename === 'RequisitionNode')
    return { kind: 'saved', node: response };
  const key = SUPPLIER_ERROR_KEYS[response.error.__typename];
  return {
    kind: 'error',
    message: key ? t(key) : response.error.description,
  };
};

// --- Send -------------------------------------------------------------------

export type SendResult =
  | { kind: 'saved'; node: InternalOrderInfoFragment }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

// The typed send refusals the client maps to copy (contract parity). The
// emergency cap carries its own count; the others are fixed strings.
const mapSendError = (typename: string, description: string): string => {
  switch (typename) {
    case 'RequisitionReasonsNotProvided':
      return t('error.reasons-not-provided-program-requisition');
    case 'CannotEditRequisition':
      return t('error.cannot-edit-requisition');
    default:
      return description;
  }
};

export const sendInternalOrder = async (
  storeId: string,
  id: string,
  // Auto-comment stamped in the same request when the store requires
  // authorisation and the order carries no comment (rules › lifecycle, AC-S7).
  comment?: string
): Promise<SendResult> => {
  const result = await graphqlFetch(UpdateInternalOrder, {
    storeId,
    input: { id, status: 'SENT', comment },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.updateRequestRequisition;
  if (response.__typename === 'RequisitionNode')
    return { kind: 'saved', node: response };
  return {
    kind: 'error',
    message: mapSendError(response.error.__typename, response.error.description),
  };
};

// --- Delete (side-panel single) ---------------------------------------------

// The side-panel single delete rides the SAME batchRequestRequisition mutation
// as the list bulk delete (contract › deletion), sending a one-element array.
// The batch is all-or-nothing; a per-member "success" can survive a rollback
// (contract wire trap), so judge only by whether any member errored.
export type DeleteResult =
  | { kind: 'deleted' }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const deleteInternalOrder = async (
  storeId: string,
  id: string
): Promise<DeleteResult> => {
  const result = await graphqlFetch(DeleteInternalOrders, {
    storeId,
    ids: [{ id }],
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const members =
    result.data.batchRequestRequisition.deleteRequestRequisitions ?? [];
  const failed = members.find(
    m => m.response.__typename === 'DeleteRequestRequisitionError'
  );
  if (!failed) return { kind: 'deleted' };
  const error =
    failed.response.__typename === 'DeleteRequestRequisitionError'
      ? failed.response.error
      : undefined;
  return {
    kind: 'error',
    message:
      error?.__typename === 'CannotEditRequisition'
        ? t('error.cannot-edit-requisition')
        : (error?.description ?? t('error.cannot-edit-requisition')),
  };
};

// --- Ancillary refresh (Add / Update) ---------------------------------------

// The toolbar banner's Add/Update (spec S3 § ancillary items, AC-A3–A5). The
// caller re-queries the order on success (the plan + lines re-read). A typed
// rejection surfaces inline; CannotEditRequisition is the only one reachable
// from an editable-gated banner, but any is mapped.
type RefreshAction = RefreshAncillaryItemsVariables['input']['action'];

export type RefreshResult =
  | { kind: 'done' }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const refreshAncillaryItems = async (
  storeId: string,
  requisitionId: string,
  action: RefreshAction
): Promise<RefreshResult> => {
  const result = await graphqlFetch(RefreshAncillaryItems, {
    storeId,
    input: { requisitionId, action },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.refreshAncillaryItems;
  if (response.__typename === 'RefreshAncillaryItemsSuccess')
    return { kind: 'done' };
  return {
    kind: 'error',
    message:
      response.error.__typename === 'CannotEditRequisition'
        ? t('error.cannot-edit-requisition')
        : response.error.description,
  };
};

// --- Add from master list (spec S7, AC-LN7/LN8) -----------------------------

// The bulk add (confirmed from the master-list picker): one line per stock item
// on the list not already on the order. Idempotent (a re-run adds nothing).
// The caller refetches the order's page on success; a rejection (its only
// surface is a description) is returned for display.
export const addInternalOrderFromMasterList = async (
  storeId: string,
  requestRequisitionId: string,
  masterListId: string
): Promise<RefreshResult> => {
  const result = await graphqlFetch(AddInternalOrderFromMasterList, {
    storeId,
    input: { requestRequisitionId, masterListId },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.addFromMasterList;
  if (response.__typename === 'RequisitionLineConnector') return { kind: 'done' };
  return { kind: 'error', message: response.error.description };
};

// --- Use suggested quantities (spec S3 § page actions, AC-Q1/Q2) -------------

// The fill-blanks tool: every zero-requested line takes its suggested quantity,
// in one call, on the whole order. Available on program orders too; Draft-only
// (the button is disabled off Draft, and the server rejects it — CannotEdit —
// otherwise). The caller refetches the line table on success; a typed rejection
// (the only one reachable via a race is CannotEditRequisition) is returned for
// display.
export const useSuggestedQuantities = async (
  storeId: string,
  requisitionId: string
): Promise<RefreshResult> => {
  const result = await graphqlFetch(UseSuggestedQuantities, {
    storeId,
    requisitionId,
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.useSuggestedQuantity;
  if (response.__typename === 'RequisitionLineConnector') return { kind: 'done' };
  return {
    kind: 'error',
    message:
      response.error.__typename === 'CannotEditRequisition'
        ? t('error.cannot-edit-requisition')
        : response.error.description,
  };
};
