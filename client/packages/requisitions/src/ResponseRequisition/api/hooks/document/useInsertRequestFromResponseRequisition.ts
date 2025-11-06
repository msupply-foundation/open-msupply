import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useInsertRequestFromResponse = () => {
  const queryClient = useQueryClient();
  const api = useResponseApi();
  return useMutation(api.insertRequestFromResponse, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
