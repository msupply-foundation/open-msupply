import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useDeleteResponses = () => {
  const queryClient = useQueryClient();
  const api = useResponseApi();
  return useMutation(api.deleteResponses, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
