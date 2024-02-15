import { SortBy, useAuthContext, useGql } from '@openmsupply-client/common';
import { OutboundListParams, getReturnsQueries } from '../../api';
import { OutboundReturnRowFragment, getSdk } from '../../operations.generated';

export const useReturnsApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['returns'] as const,
    count: () => [...keys.base(), 'count'] as const,
    outboundList: () => [...keys.base(), storeId, 'outboundList'] as const,
    outboundSortedList: (sortBy: SortBy<OutboundReturnRowFragment>) =>
      [...keys.outboundList(), sortBy] as const,
    outboundParamList: (params: OutboundListParams) =>
      [...keys.outboundList(), params] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    newReturns: () => [...keys.base(), storeId, 'newReturns'] as const,
  };

  const { client } = useGql();
  const queries = getReturnsQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};
