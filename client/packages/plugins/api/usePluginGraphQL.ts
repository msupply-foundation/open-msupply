import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

// TODO: generic useGraphql
export const usePluginDataGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId } = useAuthContext();
  const pluginDataApi = getSdk(client);

  return { pluginDataApi, queryClient, storeId };
};
