import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useGoodsReceivedGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId } = useAuthContext();
  const goodsReceivedApi = getSdk(client);

  return { goodsReceivedApi, storeId, queryClient };
};
