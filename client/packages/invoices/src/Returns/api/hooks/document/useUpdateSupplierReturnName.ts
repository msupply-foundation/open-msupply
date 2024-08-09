import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useUpdateSupplierReturnName = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();

  return useMutation(api.updateName, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
