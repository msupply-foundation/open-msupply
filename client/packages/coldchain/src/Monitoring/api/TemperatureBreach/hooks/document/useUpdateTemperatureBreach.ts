import { TEMPERATURE_NOTIFICATION } from '../../../TemperatureNotification';
import { useTemperatureBreachApi } from '../utils/useTemperatureBreachesApi';
import { useMutation, useQueryClient } from '@openmsupply-client/common';

export const useUpdateTemperatureBreach = () => {
  const queryClient = useQueryClient();
  const api = useTemperatureBreachApi();

  return useMutation(api.update, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
      // invalidating this query separately, as it can be slow
      // which delays the dialog update and refresh of the list view
      queryClient.invalidateQueries([TEMPERATURE_NOTIFICATION]);
    },
  });
};
