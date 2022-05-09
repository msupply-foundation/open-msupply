import { useAuthContext, useGql } from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';
import { getStockQueries } from '../../api';

export const useStockApi = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getStockQueries(getSdk(client), storeId);
  return { ...queries, storeId };
};
