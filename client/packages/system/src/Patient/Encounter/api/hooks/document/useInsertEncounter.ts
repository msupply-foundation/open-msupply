import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useInsertEncounter = () => {
  const queryClient = useQueryClient();
  const api = useEncounterApi();
  return useMutation(api.insertEncounter, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
