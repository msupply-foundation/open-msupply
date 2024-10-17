import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useSupplierReturnDelete = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();

  return useMutation(api.deleteSupplier, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
