import { useTemperatureNotificationApi } from '../../../TemperatureNotification/hooks/utils/useTemperatureNotificationApi';
import { useTemperatureBreachApi } from '../utils/useTemperatureBreachesApi';
import { useMutation, useQueryClient } from '@openmsupply-client/common';

export const useUpdateTemperatureBreach = () => {
  const queryClient = useQueryClient();
  const api = useTemperatureBreachApi();
  const notificationApi = useTemperatureNotificationApi();

  return useMutation(api.update, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
      queryClient.invalidateQueries(notificationApi.keys.base());
    },
  });
};
