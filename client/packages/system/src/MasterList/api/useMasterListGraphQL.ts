import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useMasterListGraphQL = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queryClient = useQueryClient();
  const masterListApi = getSdk(client);

  return { masterListApi, queryClient, storeId };
};
