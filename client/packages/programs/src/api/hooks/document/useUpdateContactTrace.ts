import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useContactTraceApi } from '../utils/useContactTraceApi';

export const useUpdateContactTrace = () => {
  const queryClient = useQueryClient();
  const api = useContactTraceApi();
  return useMutation({
    mutationFn: api.update,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.base()
    })
  });
};
