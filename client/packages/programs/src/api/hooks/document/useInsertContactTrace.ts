import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useContactTraceApi } from '../utils/useContactTraceApi';

export const useInsertContactTrace = () => {
  const queryClient = useQueryClient();
  const api = useContactTraceApi();
  return useMutation(api.insert, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
