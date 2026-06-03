import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';

export const useUpdateIndicatorValue = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  return useMutation({
    mutationFn: api.updateIndicatorValue,

    onSuccess: () => queryClient.invalidateQueries({
      queryKey: api.keys.indicators()
    })
  });
};
