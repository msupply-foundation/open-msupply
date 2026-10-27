import { graphqlFetch } from '../../api/graphql';
import {
  EncounterPrevious,
  type EncounterPreviousResult,
} from './encounter.generated';

/** How many previous encounters the side panel lists. */
export const PREVIOUS_SHOWN = 5;

export type PreviousEncounter =
  EncounterPreviousResult['encounters']['nodes'][number];

export interface PreviousEncounters {
  /**
   * The patient's earlier encounters of the type, newest first, five at most.
   */
  rows: PreviousEncounter[];
  /** Whether the patient has more of the type than the panel lists. */
  more: boolean;
}

/**
 * The side panel's Previous encounters read: the patient's earlier encounters
 * of the open encounter's type — those whose visit started before this one's
 * (`before`, the stored visit date), as the plan defines the previous
 * encounter — newest first, five at most, and whether there are more (a link
 * to the patient's Encounters tab then). The server's bound is inclusive, so
 * the open encounter is among its rows and is left out here, as is any other
 * at the very same instant — judged as instants, since the stored date and
 * the server's need not share a format or offset. A refused or failed read
 * (already reported by the app) lists none.
 */
export const fetchPreviousEncounters = async (variables: {
  storeId: string;
  patientId: string;
  type: string;
  encounterId: string;
  before: string;
}): Promise<PreviousEncounters> => {
  const result = await graphqlFetch(EncounterPrevious, {
    storeId: variables.storeId,
    patientId: variables.patientId,
    type: variables.type,
    before: variables.before,
    first: PREVIOUS_SHOWN + 1,
  });
  if (result.kind !== 'success') return { rows: [], more: false };
  const { nodes, totalCount } = result.data.encounters;
  const before = new Date(variables.before).getTime();
  const earlier = nodes.filter(
    n =>
      n.id !== variables.encounterId &&
      new Date(n.startDatetime).getTime() < before
  );
  const rows = earlier.slice(0, PREVIOUS_SHOWN);
  // Of the total, the open encounter and any other at the same instant are
  // not earlier; those among the rows read are known, the rest assumed none.
  const notEarlier = nodes.length - earlier.length;
  return { rows, more: totalCount - notEarlier > rows.length };
};
