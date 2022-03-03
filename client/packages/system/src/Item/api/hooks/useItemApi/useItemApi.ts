import { getItemQueries } from './../../api';
import { useAuthContext, useOmSupplyApi } from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';

export const useItemApi = () => {
  const { client } = useOmSupplyApi();
  const { storeId } = useAuthContext();
  const queries = getItemQueries(getSdk(client), storeId);
  return { ...queries, storeId };
};
