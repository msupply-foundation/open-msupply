import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  type GraphqlResult,
} from '@/api/graphql';
import { generateUUID } from '@/uuid';
import {
  VaccinationCard,
  VaccinationCardPatient,
  VaccinationReason,
} from './vaccinationCard.generated';
import {
  DoseVaccination,
  InsertVaccination,
  UpdateVaccination,
  VaccinationDose,
  VaccineBatches,
} from './doseEditor.generated';
import type { CardRow } from './cardModel';
import type { DoseDraft, DraftContext } from './doseDraft';
import { insertInput, updateInput } from './doseDraft';

/*
 * The vaccination card's data access (spec/vaccination-card contract): the
 * never-throwing query method, each fetcher returning undefined on a failure
 * the global error path has already reported.
 */

export interface LoadedCard {
  programName: string;
  rows: CardRow[];
  /** Not-given reasons by vaccination id (contract: backend gap). */
  reasons: Record<string, string | null>;
}

/**
 * The card for an enrolment. The server's not-found answer reads as a card
 * with no rows (README § captured as-is). The reason of each not-given dose
 * is read by its vaccination, the card row carrying none.
 */
export const fetchCard = async (args: {
  storeId: string;
  programEnrolmentId: string;
}): Promise<LoadedCard | undefined> => {
  const result = await graphqlFetch(VaccinationCard, args);
  if (result.kind !== 'success') return undefined;
  const card = result.data.vaccinationCard;
  if (card.__typename !== 'VaccinationCardNode')
    return { programName: '', rows: [], reasons: {} };
  const notGiven = card.items.filter(
    r => r.status === 'NOT_GIVEN' && r.vaccinationId !== null
  );
  const reads = await Promise.all(
    notGiven.map(r =>
      graphqlFetch(VaccinationReason, {
        storeId: args.storeId,
        id: r.vaccinationId ?? '',
      })
    )
  );
  const reasons: Record<string, string | null> = {};
  for (const read of reads) {
    if (read.kind === 'success' && read.data.vaccination)
      reasons[read.data.vaccination.id] = read.data.vaccination.notGivenReason;
  }
  return { programName: card.programName, rows: card.items, reasons };
};

/** The patient's facts the card's summary states. */
export const fetchCardPatient = async (args: {
  storeId: string;
  patientId: string;
}) => {
  const result = await graphqlFetch(VaccinationCardPatient, args);
  if (result.kind !== 'success') return undefined;
  return { patient: result.data.patient };
};

/** The dose the editor opens, with its course, and its recorded vaccination. */
export const fetchDose = async (args: {
  storeId: string;
  doseId: string;
  vaccinationId: string | null;
}) => {
  const [dose, vaccination] = await Promise.all([
    graphqlFetch(VaccinationDose, { doseId: args.doseId }),
    args.vaccinationId
      ? graphqlFetch(DoseVaccination, {
          storeId: args.storeId,
          id: args.vaccinationId,
        })
      : Promise.resolve(undefined),
  ]);
  if (dose.kind !== 'success') return undefined;
  if (vaccination && vaccination.kind !== 'success') return undefined;
  const node = dose.data.vaccineCourseDose;
  if (node.__typename !== 'VaccineCourseDoseNode') return undefined;
  return {
    dose: node,
    vaccination: vaccination?.data.vaccination ?? null,
  };
};

/** The store's batches of an item, with the item's doses per unit. */
export const fetchBatches = async (args: {
  storeId: string;
  itemId: string;
}) => {
  const result = await graphqlFetch(VaccineBatches, args);
  if (result.kind !== 'success') return undefined;
  const item = result.data.items.nodes[0];
  return {
    // A vaccine with no configured doses per unit counts as one.
    dosesPerUnit: item?.doses || 1,
    batches: item?.availableBatches.nodes ?? [],
  };
};

export type SaveOutcome =
  | { kind: 'saved' }
  | { kind: 'notMostRecentGivenDose' }
  | { kind: 'refused' }
  | { kind: 'forbidden'; permissions: string[] }
  | { kind: 'failed' };

/**
 * A save the server refused. The save takes its GraphQL errors itself, and so
 * receives a missing permission among them: that one is the permission-denied
 * notice's (contract § access), not a refusal shown in the editor.
 */
const refusal = (
  result: Extract<GraphqlResult<unknown>, { kind: 'graphqlError' }>
): SaveOutcome =>
  isForbidden(result.errors)
    ? { kind: 'forbidden', permissions: missingPermissions(result.errors) }
    : { kind: 'refused' };

/**
 * Saves the draft: an insert for a new dose (every refusal is a top-level
 * error — contract § recording a dose), an update for a recorded one (whose
 * only typed refusal is NotMostRecentGivenDose). Refusals come back to the
 * editor to show in place, never the global error modal; a missing permission
 * comes back as `forbidden`, for the permission-denied notice.
 */
export const saveDose = async (args: {
  draft: DoseDraft;
  ctx: DraftContext;
  encounterId: string;
  vaccineCourseDoseId: string;
}): Promise<SaveOutcome> => {
  if (args.ctx.vaccination) {
    const result = await graphqlFetch(
      UpdateVaccination,
      {
        storeId: args.ctx.storeId,
        input: updateInput(args.draft, args.ctx),
      },
      { returnGraphqlErrors: true }
    );
    if (result.kind === 'graphqlError') return refusal(result);
    if (result.kind !== 'success') return { kind: 'failed' };
    return result.data.updateVaccination.__typename === 'VaccinationNode'
      ? { kind: 'saved' }
      : { kind: 'notMostRecentGivenDose' };
  }
  const result = await graphqlFetch(
    InsertVaccination,
    {
      storeId: args.ctx.storeId,
      input: insertInput(args.draft, {
        id: generateUUID(),
        encounterId: args.encounterId,
        vaccineCourseDoseId: args.vaccineCourseDoseId,
      }),
    },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') return refusal(result);
  if (result.kind !== 'success') return { kind: 'failed' };
  return { kind: 'saved' };
};
