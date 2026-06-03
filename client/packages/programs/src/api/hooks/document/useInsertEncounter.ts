import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useInsertEncounter = () => {
  const queryClient = useQueryClient();
  const api = useEncounterApi();
  return useMutation({
    mutationFn: api.insertEncounter,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.base()
    })
  });
};
