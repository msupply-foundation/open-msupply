import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { useAllocateNumberApi } from '../utils/useAllocateNumberApi';

export const useAllocateNumber = () => {
  const queryClient = useQueryClient();
  const api = useAllocateNumberApi();
  return useMutation(api.allocateNumber, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
