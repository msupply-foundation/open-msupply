import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useVaccinationsGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId, store } = useAuthContext();
  const api = getSdk(client);

  return { api, queryClient, storeId, store };
};
