import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useInsertSupplierReturn = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  return useMutation(api.insertSupplierReturn, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
