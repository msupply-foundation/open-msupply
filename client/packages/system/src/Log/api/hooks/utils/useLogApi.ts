import { useGql } from '@openmsupply-client/common';
import { getServerLogQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useLogApi = () => {
  const keys = {
    base: () => ['log'] as const,
    list: () => [...keys.base(), 'list'] as const,
  };
  const { client } = useGql();
  const sdk = getSdk(client);
  const queries = getServerLogQueries(sdk);
  return { ...queries, keys };
};
