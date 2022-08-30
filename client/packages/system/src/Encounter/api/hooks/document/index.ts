import { useInsertEncounter } from './useInsertEncounter';
import { useEncounters } from './useEncounters';
import { useEncounter } from './useEncounter';
import { useUpdateEncounter } from './useUpdateEncounter';
import {
  useUpsertEncounter,
  useUpsertEncounterDocument,
} from './useUpsertEncounter';

export const Document = {
  useEncounter,
  useEncounters,
  useInsertEncounter,
  useUpdateEncounter,
  useUpsertEncounter,
  useUpsertEncounterDocument,
};
