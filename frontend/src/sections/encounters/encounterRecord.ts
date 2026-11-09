import { graphqlFetch } from '../../api/graphql';
import {
  EncounterRecord,
  type EncounterRecordFragment,
} from './encounter.generated';

/**
 * The encounter record screen's read: the encounter, or `record` undefined
 * where the address names no encounter the user can read. A refused or
 * failed read answers the same way. The app has already reported it (the
 * permission dialog, or its error), and the screen then shows its not-found
 * notice instead of loading for ever (OMS-REG-ENC-01.5).
 */
export const fetchEncounterRecord = async (variables: {
  storeId: string;
  id: string;
}): Promise<{ record: EncounterRecordFragment | undefined }> => {
  const result = await graphqlFetch(EncounterRecord, variables);
  if (result.kind !== 'success') return { record: undefined };
  return { record: result.data.encounters.nodes[0] };
};
