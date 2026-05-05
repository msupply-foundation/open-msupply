import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useSupplierReturnDelete = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();

  return useMutation(api.deleteSupplier, {
    // `void` is load-bearing: returning the invalidateQueries promise would make
    // mutateAsync await the refetch of the just-deleted detail query and hang.
    onSuccess: () => void queryClient.invalidateQueries(api.keys.base()),
  });
};
