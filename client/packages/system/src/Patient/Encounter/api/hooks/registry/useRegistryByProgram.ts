import { useMutation } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useRegistryByProgram = () => {
  const api = useEncounterApi();

  return {
    ...useMutation(async (parentId: string) =>
      api.get.registries({ filterBy: { parentId: { equalTo: parentId } } })
    ),
  };
};
