import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useSyncApi } from '../utils/useSyncApi';

export const useManualSync = () => {
  const api = useSyncApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: api.manualSync,

    onSettled: () => queryClient.invalidateQueries({
      queryKey: api.keys.syncInfo()
    })
  });

  return {
    ...mutation,
    // map react-query required input of "string | undefined" to optional string
    mutateAsync: (patientId?: string) => mutation.mutateAsync(patientId),
  };
};
