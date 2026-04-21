import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const usePluginsGraphQL = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queryClient = useQueryClient();
  const pluginApi = getSdk(client);

  return { pluginApi, queryClient, storeId };
};
