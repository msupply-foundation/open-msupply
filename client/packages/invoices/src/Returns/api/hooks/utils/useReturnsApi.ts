import { useAuthContext, useGql } from '@openmsupply-client/common';
import { getReturnsQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useReturnsApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['returns'] as const,
    count: () => [...keys.base(), 'count'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    newReturns: () => [...keys.base(), storeId, 'newReturns'] as const,
  };

  const { client } = useGql();
  const queries = getReturnsQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};
