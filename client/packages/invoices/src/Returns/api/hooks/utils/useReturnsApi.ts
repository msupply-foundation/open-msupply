import { SortBy, useAuthContext, useGql } from '@openmsupply-client/common';
import {
  InboundListParams,
  OutboundListParams,
  getReturnsQueries,
} from '../../api';
import {
  InboundReturnRowFragment,
  OutboundReturnRowFragment,
  getSdk,
} from '../../operations.generated';

export const useReturnsApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['returns'] as const,
    count: () => [...keys.base(), 'count'] as const,
    inboundList: () => [...keys.base(), storeId, 'inboundList'] as const,
    inboundSortedList: (sortBy: SortBy<InboundReturnRowFragment>) =>
      [...keys.outboundList(), sortBy] as const,
    inboundParamList: (params: InboundListParams) =>
      [...keys.outboundList(), params] as const,
    outboundList: () => [...keys.base(), storeId, 'outboundList'] as const,
    outboundSortedList: (sortBy: SortBy<OutboundReturnRowFragment>) =>
      [...keys.outboundList(), sortBy] as const,
    outboundParamList: (params: OutboundListParams) =>
      [...keys.outboundList(), params] as const,
    detail: (invoiceNumber: string) =>
      [...keys.base(), storeId, invoiceNumber] as const,
    generatedOutboundLines: (itemId?: string) =>
      [...keys.base(), storeId, 'generatedOutboundLines', itemId] as const,
    generatedInboundLines: (itemId?: string) =>
      [...keys.base(), storeId, 'generatedInboundLines', itemId] as const,
  };

  const { client } = useGql();
  const queries = getReturnsQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};
