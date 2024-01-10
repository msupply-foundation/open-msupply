import { useTemperatureBreachApi } from '../utils/useTemperatureBreachesApi';
import { useMutation, useQueryClient } from '@openmsupply-client/common';

export const useUpdateTemperatureBreach = () => {
  const queryClient = useQueryClient();
  const api = useTemperatureBreachApi();

  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
