import {
  SortBy,
  FilterBy,
  useGql,
  useAuthContext,
} from '@openmsupply-client/common';
import { OutboundRowFragment, getSdk } from '../../operations.generated';
import { getOutboundQueries } from '../../api';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<OutboundRowFragment>;
  filterBy: FilterBy | null;
};

export const useOutboundApi = () => {
  const keys = {
    base: () => ['outbound'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };

  const { client } = useGql();
  const sdk = getSdk(client);
  const { storeId } = useAuthContext();
  const queries = getOutboundQueries(sdk, storeId);
  return { ...queries, storeId, keys };
};
