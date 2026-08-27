import { useGql, useQueryClient } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useCurrencyGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const currencyApi = getSdk(client);

  return { currencyApi, queryClient };
};
