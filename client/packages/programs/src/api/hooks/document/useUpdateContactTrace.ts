import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useContactTraceApi } from '../utils/useContactTraceApi';

export const useUpdateContactTrace = () => {
  const queryClient = useQueryClient();
  const api = useContactTraceApi();
  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
