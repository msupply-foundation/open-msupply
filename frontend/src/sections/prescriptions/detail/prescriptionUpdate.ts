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

/**
 * The prescription date for CREATION — `undefined` for today, meaning **send
 * no `prescriptionDate` at all** (the same shape the stock adjust modal uses:
 * stock/stockCalc.ts `backdatedDatetime`).
 *
 * Today means "not backdated", and at creation that is expressible: with the
 * field absent, `backdatedDatetime` stays null (source-verified — prescription
 * insert/generate.rs only calls `handle_new_backdated_datetime` when a date is
 * given). Sending the current moment instead would backdate every new
 * prescription to its own creation instant, and ANY non-null
 * `backdatedDatetime` switches the item editor to historical stock, dropping
 * batches that had no availability then (get_draft_outbound_lines.rs) — so
 * stock received after the prescription was created could never be dispensed
 * on it. Only an EARLIER day is a real backdate, and it rides as its
 * end-of-day instant like everywhere else.
 *
 * Editing is different: there the field must always be sent, because omitting
 * it leaves the stored date untouched (prescription update/generate.rs) — see
 * {@link prescriptionDateInstant}.
 */
export const newPrescriptionDate = (isoDay: string): string | undefined =>
  isoDay === localTodayIso() ? undefined : prescriptionDateInstant(isoDay);
