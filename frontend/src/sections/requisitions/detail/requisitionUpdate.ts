import { graphqlFetch } from '../../../api/graphql';
import { t, tPlural } from '../../../intl';
import {
  AddRequisitionFromMasterList,
  CreateShipmentFromRequisition,
  SupplyRequestedQuantity,
  UpdateRequisition,
  type RequisitionInfoFragment,
  type UpdateRequisitionVariables,
} from './requisitionDetail.generated';

// The header-level save for the detail screen (customer reference / comment /
// colour — rules › header edits). Every save is validated against the WHOLE
// record, so it can be rejected for reasons unrelated to the edited field:
// the variance-reason guard names the offending lines (their Reason cells
// flag, AC-H4), the emergency cap names the maximum it enforced, and an
// uneditable requisition answers cannot-edit. Typed rejections are returned
// for inline display (never a toast — ui-standards › action feedback);
// transport failures go through the global unexpected-error modal.

type UpdateInput = UpdateRequisitionVariables['input'];

export type SaveFieldsResult =
  | { kind: 'saved'; node: RequisitionInfoFragment }
  | {
      kind: 'error';
      message: string;
      // The lines a RequisitionReasonsNotProvided rejection named, so the
      // detail can flag their Reason cells (AC-H4); empty for other errors.
      reasonLineIds: string[];
    }
  | { kind: 'failed' };

const mapError = (error: {
  __typename: string;
  description: string;
  maxItemsInEmergencyOrder?: number;
}): string => {
  switch (error.__typename) {
    case 'RequisitionReasonsNotProvided':
      return t('error.reasons-not-provided-program-requisition');
    case 'CannotEditRequisition':
      return t('error.cannot-edit-requisition');
    case 'OrderingTooManyItems':
      // Pluralised key — interpolates the cap the server named.
      return tPlural(
        'error.ordering-too-many-items',
        error.maxItemsInEmergencyOrder ?? 0
      );
    default:
      return error.description;
  }
};

export const saveRequisitionFields = async (
  storeId: string,
  input: UpdateInput
): Promise<SaveFieldsResult> => {
  const result = await graphqlFetch(UpdateRequisition, { storeId, input });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.updateResponseRequisition;
  if (response.__typename === 'RequisitionNode')
    return { kind: 'saved', node: response };
  const error = response.error;
  const reasonLineIds =
    error.__typename === 'RequisitionReasonsNotProvided'
      ? error.errors.map(e => e.requisitionLine.id)
      : [];
  return { kind: 'error', message: mapError(error), reasonLineIds };
};

// --- Add from master list (spec S2 § page actions, AC-ML1/ML2) --------------

// The confirmed bulk add: one line per stock item on the chosen list not
// already on the requisition. Idempotent (a re-run adds nothing). The caller
// refetches the line list on success; a rejection surfaces with fixed copy
// (spec S2): the not-found member under its own message, anything else under
// the generic cannot-add copy.
export type AddFromMasterListResult =
  | { kind: 'done' }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const addRequisitionFromMasterList = async (
  storeId: string,
  responseRequisitionId: string,
  masterListId: string
): Promise<AddFromMasterListResult> => {
  const result = await graphqlFetch(AddRequisitionFromMasterList, {
    storeId,
    input: { responseRequisitionId, masterListId },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.responseAddFromMasterList;
  if (response.__typename === 'RequisitionLineConnector')
    return { kind: 'done' };
  return {
    kind: 'error',
    message:
      response.error.__typename === 'MasterListNotFoundForThisStore'
        ? t('error.master-list-not-found-for-this-store')
        : t('error.cannot-add-items-to-requisition'),
  };
};

// --- Supply requested / approved (rules § auto-populating) -------------------

// The auto-populate: one call fills every line's supply quantity with its
// requested quantity — or its APPROVED quantity when the requisition carries
// an approval status (the server picks; the action only mirrors the choice in
// its labels). The caller refetches the line list on success. The typed
// cannot-edit rejection is normally unreachable (the button is disabled while
// the requisition is not editable) — the server backstop for a race.
export type SupplyRequestedResult =
  | { kind: 'done' }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const supplyRequestedQuantities = async (
  storeId: string,
  responseRequisitionId: string
): Promise<SupplyRequestedResult> => {
  const result = await graphqlFetch(SupplyRequestedQuantity, {
    storeId,
    input: { responseRequisitionId },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.supplyRequestedQuantity;
  if (response.__typename === 'RequisitionLineConnector')
    return { kind: 'done' };
  switch (response.error.__typename) {
    case 'CannotEditRequisition':
      return { kind: 'error', message: t('error.cannot-edit-requisition') };
    case 'RecordNotFound':
      return { kind: 'error', message: t('messages.record-not-found') };
    default:
      return { kind: 'error', message: response.error.description };
  }
};

// Raising a shipment (rules › raising a shipment): the outstanding remainder
// becomes a new outbound shipment, permanently linked. The footer pre-checks
// permission and nothing-remaining without a call; the typed rejections here
// are the server's own (contract › raising a shipment) — cannot-edit once
// Finalised, and the nothing-remaining backstop behind the pre-check.
export type CreateShipmentResult =
  | { kind: 'created'; invoiceId: string }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const createShipmentFromRequisition = async (
  storeId: string,
  responseRequisitionId: string
): Promise<CreateShipmentResult> => {
  const result = await graphqlFetch(CreateShipmentFromRequisition, {
    storeId,
    input: { responseRequisitionId },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.createRequisitionShipment;
  if (response.__typename === 'InvoiceNode')
    return { kind: 'created', invoiceId: response.id };
  switch (response.error.__typename) {
    case 'CannotEditRequisition':
      return { kind: 'error', message: t('error.cannot-edit-requisition') };
    case 'NothingRemainingToSupply':
      // Normally caught by the client pre-check; the server backstop.
      return {
        kind: 'error',
        message: t('message.all-lines-have-been-fulfilled'),
      };
    case 'RecordNotFound':
      return { kind: 'error', message: t('messages.record-not-found') };
    default:
      return { kind: 'error', message: response.error.description };
  }
};
