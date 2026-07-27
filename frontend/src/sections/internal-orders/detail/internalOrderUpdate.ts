import { graphqlFetch } from '../../../api/graphql';
import { t, type LocaleKey } from '../../../intl';
import {
  UpdateInternalOrder,
  type InternalOrderInfoFragment,
  type UpdateInternalOrderVariables,
} from './internalOrderDetail.generated';

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
