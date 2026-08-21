import { graphqlFetch } from '../../../api/graphql';
import {
  localDayToUtc,
  localTodayIso,
} from '../../../ui/elements/inputs/dateTimeConvert';
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
 * A prescription date for the wire: a PAST day is widened to its LOCAL
 * end-of-day instant (matching the reference client), but **today keeps the
 * actual current moment** — the same rule the outbound picked date already
 * follows (outbound-shipments/detail/backdating.ts `backdatedDatetimeFor`).
 *
 * Today must not be widened (#1211). End-of-day today is always in the future,
 * and a future instant is silently DROPPED by the server — it clears
 * `backdatedDatetime` instead of storing it (contract wire trap, AC-B5). The
 * date then displays as `backdatedDatetime ?? createdDatetime`, so a
 * prescription created on an earlier day snapped straight back to its creation
 * date and could never be dated today. Sending the current moment stores it
 * (server-verified), and for a prescription created today it is
 * indistinguishable from not backdating at all.
 */
export const prescriptionDateInstant = (isoDay: string): string =>
  isoDay === localTodayIso()
    ? new Date().toISOString()
    : localDayToUtc(isoDay, { endOfDay: true });
