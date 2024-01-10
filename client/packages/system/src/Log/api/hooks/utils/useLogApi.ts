import { useGql } from '@openmsupply-client/common';
import { getServerLogQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useLogApi = () => {
  const keys = {
    base: () => ['serverLog'] as const,
    logLevel: () => [...keys.base(), 'logLevel'] as const,
    fileNames: () => [...keys.base(), 'fileNames'] as const,
  };
  const { client } = useGql();
  const sdk = getSdk(client);
  const queries = getServerLogQueries(sdk);
  return { ...queries, keys };
};
