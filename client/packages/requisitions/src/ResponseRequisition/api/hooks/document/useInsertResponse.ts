import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useInsertResponse = () => {
  const queryClient = useQueryClient();
  const api = useResponseApi();
  return useMutation(api.insert, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
