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
  /** The patient's other encounters of the type, newest first, at most five. */
  rows: PreviousEncounter[];
  /** Whether the patient has more of the type than the panel lists. */
  more: boolean;
}

/**
 * The side panel's Previous encounters read: the patient's other encounters
 * of the open encounter's type, newest first, five at most, and whether there
 * are more (a link to the patient's Encounters tab then). The open encounter
 * is among the server's rows and is left out here. A refused or failed read
 * (already reported by the app) lists none.
 */
export const fetchPreviousEncounters = async (variables: {
  storeId: string;
  patientId: string;
  type: string;
  encounterId: string;
}): Promise<PreviousEncounters> => {
  const result = await graphqlFetch(EncounterPrevious, {
    storeId: variables.storeId,
    patientId: variables.patientId,
    type: variables.type,
    first: PREVIOUS_SHOWN + 1,
  });
  if (result.kind !== 'success') return { rows: [], more: false };
  const { nodes, totalCount } = result.data.encounters;
  const others = nodes.filter(n => n.id !== variables.encounterId);
  const rows = others.slice(0, PREVIOUS_SHOWN);
  // The open encounter counts once in the total when it is of this type.
  const own = nodes.some(n => n.id === variables.encounterId) ? 1 : 0;
  return { rows, more: totalCount - own > rows.length };
};
