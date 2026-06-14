import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { NameSortFieldInput, type NameFilterInput } from '@/gql/schema';
import { namesSdk } from './api';

// Shared list params for any name-backed list page (customers, suppliers).
// Each page supplies its own `filter` (isCustomer / isSupplier) and a stable
// `listId` for the cache.
export interface ListParams {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDesc: boolean;
}

const SORT_FIELD: Record<string, NameSortFieldInput> = {
  code: NameSortFieldInput.Code,
  name: NameSortFieldInput.Name,
};

const toSortField = (key: string): NameSortFieldInput =>
  SORT_FIELD[key] ?? NameSortFieldInput.Name;

export const nameKeys = {
  // `filter` is part of the key so search changes refetch.
  list: (
    storeId: string,
    listId: string,
    filter: NameFilterInput,
    params: ListParams,
  ) => ['names', storeId, listId, filter, params] as const,
};

export const nameListQueryOptions = (
  storeId: string,
  listId: string,
  filter: NameFilterInput,
  params: ListParams,
) =>
  queryOptions({
    queryKey: nameKeys.list(storeId, listId, filter, params),
    queryFn: async () => {
      const res = await namesSdk.names({
        storeId,
        first: params.pageSize,
        offset: (params.page - 1) * params.pageSize,
        key: toSortField(params.sortKey),
        desc: params.sortDesc,
        filter,
      });
      return res.names;
    },
    placeholderData: keepPreviousData,
  });
