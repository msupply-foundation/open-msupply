import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useContactTraceApi } from '../utils/useContactTraceApi';

export const useInsertContactTrace = () => {
  const queryClient = useQueryClient();
  const api = useContactTraceApi();
  return useMutation(api.insertContactTrace, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
