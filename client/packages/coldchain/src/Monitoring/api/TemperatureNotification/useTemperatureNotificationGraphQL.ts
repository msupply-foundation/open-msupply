import { useAuthContext, useGql, useQueryClient } from 'packages/common/src';
import { getSdk } from './operations.generated';

export const useTemperatureNotificationGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId } = useAuthContext();
  const temperatureNotificationApi = getSdk(client);

  return { temperatureNotificationApi, queryClient, storeId };
};
