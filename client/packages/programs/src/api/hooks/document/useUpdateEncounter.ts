import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useUpdateEncounter = () => {
  const queryClient = useQueryClient();
  const api = useEncounterApi();
  return useMutation({
    mutationFn: api.updateEncounter,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.base()
    })
  });
};
