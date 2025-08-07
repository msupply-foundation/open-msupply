import { useAuthContext, useGql } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useGoodsReceivedGraphQL = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();

  const goodsReceivedApi = getSdk(client);

  return { goodsReceivedApi, storeId };
};
