import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useInsertCustomerReturn = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  return useMutation(api.insertCustomerReturn, {
    onSuccess: () => {
      return queryClient.invalidateQueries(api.keys.base());
    },
  });
};
