import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';
import { PREFERENCES } from './keys';

export const usePreferencesGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId, store } = useAuthContext();
  const api = getSdk(client);

  return { api, queryClient, storeId, store, client, PREFERENCES };
};
