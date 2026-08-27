import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useContactTraceApi } from '../utils/useContactTraceApi';

export const useInsertContactTrace = () => {
  const queryClient = useQueryClient();
  const api = useContactTraceApi();
  return useMutation({
    mutationFn: api.insert,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.base()
    })
  });
};
