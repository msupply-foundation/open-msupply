import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useLocationGraphQL = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queryClient = useQueryClient();
  const locationApi = getSdk(client);

  return { locationApi, queryClient, storeId };
};
