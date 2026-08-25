import { graphqlFetch } from '../../../api/graphql';
import {
  localDayToUtc,
  localTodayIso,
} from '../../../ui/elements/inputs/dateTimeConvert';
import {
  UpdatePrescriptionOrder,
  type PrescriptionOrderFieldsFragment,
  type UpdatePrescriptionOrderVariables,
} from './prescriptionOrderDetail.generated';

// The order-level write (spec/prescription-orders/contract.md): one partial
// update carries header edits, custom-field patches, and the Ready-to-dispense
// hand-over. EVERY rejection on this surface is generic — a formatted reason
// string, no typed members (contract § wire traps) — so the caller chooses:
// `inSurface` returns the message for the surface that started the save (the
// status footer's dialog); without it a rejection rides the global error
// modal inside graphqlFetch and comes back as `failed`.

export type UpdateInput = UpdatePrescriptionOrderVariables['input'];

export type SaveOutcome =
  | { kind: 'saved'; node: PrescriptionOrderFieldsFragment }
  | { kind: 'rejected'; description: string }
  | { kind: 'failed' };

export const savePrescriptionOrder = async (
  storeId: string,
  input: UpdateInput,
  opts?: { inSurface?: boolean }
): Promise<SaveOutcome> => {
  const result = await graphqlFetch(
    UpdatePrescriptionOrder,
    { storeId, input },
    opts?.inSurface ? { returnGraphqlErrors: true } : undefined
  );
  if (result.kind === 'success')
    return { kind: 'saved', node: result.data.updatePrescriptionOrder };
  if (result.kind === 'graphqlError')
    return { kind: 'rejected', description: result.message };
  return { kind: 'failed' };
};

/**
 * A prescription date for the wire: a PAST day is widened to its LOCAL
 * end-of-day instant, while **today keeps the actual current moment** — the
 * same rule the dispensing prescription date follows (its
 * prescriptionUpdate.ts `prescriptionDateInstant`), so the generated
 * dispensation adopts a date shaped exactly as if it had been entered there.
 */
export const prescriptionOrderDateInstant = (isoDay: string): string =>
  isoDay === localTodayIso()
    ? new Date().toISOString()
    : localDayToUtc(isoDay, { endOfDay: true });

/**
 * The prescription date for CREATION — `undefined` for today, meaning send no
 * date at all: the server stamps the creation moment (contract § creation).
 * Only an earlier day is a real backdate, riding as its end-of-day instant.
 */
export const newPrescriptionOrderDate = (isoDay: string): string | undefined =>
  isoDay === localTodayIso() ? undefined : prescriptionOrderDateInstant(isoDay);
