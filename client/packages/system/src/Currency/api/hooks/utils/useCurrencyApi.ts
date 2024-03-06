import { useGql } from '@openmsupply-client/common';
import { getCurrencyQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useCurrencyApi = () => {
  const keys = {
    base: () => ['currency'] as const,
    list: () => [...keys.base(), 'list'] as const,
  };
  const { client } = useGql();
  const sdk = getSdk(client);
  const queries = getCurrencyQueries(sdk);
  return { ...queries, keys };
};
