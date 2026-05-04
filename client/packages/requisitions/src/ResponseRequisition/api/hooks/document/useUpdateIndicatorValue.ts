import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useUpdateIndicatorValue = () => {
  const queryClient = useQueryClient();
  const api = useResponseApi();
  return useMutation({
    mutationFn: api.updateIndicatorValue,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.indicators()
    })
  });
};
