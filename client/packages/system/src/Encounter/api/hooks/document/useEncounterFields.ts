import { EncounterFragment } from '../../operations.generated';
import { useEncounterId } from '../utils/useEncounterId';
import { useEncounter } from './useEncounter';
import { useUpdateEncounter } from './useUpdateEncounter';

export const useEncounterFields = <
  KeyOfEncounter extends keyof EncounterFragment
>() => {
  const { data } = useEncounter();
  const { mutateAsync } = useUpdateEncounter();
  const id = useEncounterId();

  return async (patch: Record<KeyOfEncounter, unknown>) =>
    await mutateAsync({
      data: { ...data, ...patch },
      parent: id,
      schemaId: data?.document.documentRegistry?.formSchemaId || '',
    });
};
