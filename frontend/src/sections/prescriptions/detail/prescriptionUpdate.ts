import { graphqlFetch } from '../../../api/graphql';
import { localDayToUtc } from '../../../ui/elements/inputs/dateTimeConvert';
import {
  UpdatePrescription,
  DeletePrescriptionLines,
  type PrescriptionFieldsFragment,
  type UpdatePrescriptionVariables,
} from './prescriptionDetail.generated';

// The prescription-level writes (spec/prescriptions/contract.md): one partial
// update carries header edits, status changes, cancellation, and the payment
// fields. Typed rejections (InvoiceIsNotEditable, RecordNotFound, and
// InvalidStockSelection — the cannot-backdate guard whose name lies) come
// back as `rejected` with the server's description for the caller's surface;
// everything non-typed routes to the global modal inside graphqlFetch.

export type UpdateInput = UpdatePrescriptionVariables['input'];

export type SaveOutcome =
  | { kind: 'saved'; node: PrescriptionFieldsFragment }
  | { kind: 'rejected'; typename: string; description: string }
  | { kind: 'failed' };

export const savePrescription = async (
  storeId: string,
  input: UpdateInput
): Promise<SaveOutcome> => {
  const result = await graphqlFetch(UpdatePrescription, { storeId, input });
  if (result.kind !== 'success') return { kind: 'failed' };
  const payload = result.data.updatePrescription;
  if (payload.__typename === 'InvoiceNode')
    return { kind: 'saved', node: payload };
  if (payload.__typename === 'UpdatePrescriptionError')
    return {
      kind: 'rejected',
      typename: payload.error.__typename,
      description: payload.error.description,
    };
  return {
    kind: 'rejected',
    typename: 'NodeError',
    description: payload.error.description,
  };
};

/**
 * Delete every given line — the date/program-change clear-lines step (AC-B2)
 * and the selection footer's bulk delete. All-or-nothing on the wire; only
 * ever sent while the prescription is editable.
 */
export const deleteLines = async (
  storeId: string,
  lineIds: string[]
): Promise<boolean> => {
  if (lineIds.length === 0) return true;
  const result = await graphqlFetch(DeletePrescriptionLines, {
    storeId,
    ids: lineIds.map(id => ({ id })),
  });
  if (result.kind !== 'success') return false;
  const responses = result.data.batchPrescription.deletePrescriptionLines ?? [];
  return responses.every(row => 'id' in row.response);
};

/**
 * A prescription date for the wire: the picked LOCAL calendar day widened to
 * its end-of-day instant (matching the reference client), so "today" reads as
 * not-backdated — the server clears a future instant rather than storing it
 * (contract wire trap: futures are silently dropped, AC-B5 — the picker caps
 * at today so nothing sent here is meaningfully future).
 */
export const prescriptionDateInstant = (isoDay: string): string =>
  localDayToUtc(isoDay, { endOfDay: true });
