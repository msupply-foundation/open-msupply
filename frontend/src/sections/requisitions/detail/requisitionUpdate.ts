import { graphqlFetch } from '../../../api/graphql';
import { t, tPlural } from '../../../intl';
import {
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
