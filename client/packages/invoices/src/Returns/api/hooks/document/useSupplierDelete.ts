import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useSupplierReturnDelete = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();

  return useMutation({
    mutationFn: api.deleteSupplier,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.base()
    })
  });
};
