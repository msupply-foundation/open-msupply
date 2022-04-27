import { useAuthContext, useGql } from '@openmsupply-client/common';
import { getHostQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useHostApi = () => {
  const keys = {
    base: () => ['host'] as const,
    version: () => [...keys.base(), 'version'] as const,
    settings: () => [...keys.base(), 'settings'] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getHostQueries(getSdk(client));
  return { ...queries, storeId, keys };
};
