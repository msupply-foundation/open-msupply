import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useTemperatureLogGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId } = useAuthContext();
  const temperatureLogApi = getSdk(client);

  return { temperatureLogApi, queryClient, storeId };
};
