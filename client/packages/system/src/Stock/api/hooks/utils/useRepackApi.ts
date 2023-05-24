import { useAuthContext, useGql } from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';
import { getRepackQueries } from '../../api';

export const useRepackApi = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getRepackQueries(getSdk(client), storeId);

  const keys = {
    base: () => ['repack'] as const,
    repack: (invoiceId: string) => [...keys.base(), invoiceId] as const,
    listByStockLine: (stockLineId: string) =>
      [...keys.base(), storeId, stockLineId] as const,
  };

  return { ...queries, keys, storeId };
};
