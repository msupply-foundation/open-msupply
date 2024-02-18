import { useGql } from '@openmsupply-client/common';
import { getReturnReasonsQuery } from '../../api';
import { getSdk } from '../../operations.generated';

export const useReturnReasonApi = () => {
  const keys = {
    base: () => ['returnReason'] as const,
    list: () => [...keys.base(), 'list'] as const,
  };

  const { client } = useGql();
  const sdk = getSdk(client);
  const queries = getReturnReasonsQuery(sdk);
  return { ...queries, keys };
};
