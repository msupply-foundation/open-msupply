import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';

export const useUpdateIndicatorValue = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  return useMutation(api.updateIndicatorValue, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.indicators()),
  });
};
