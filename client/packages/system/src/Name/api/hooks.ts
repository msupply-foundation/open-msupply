import {
  useGql,
  useAuthContext,
  useQuery,
  useQueryParamsStore,
} from '@openmsupply-client/common';
import { getNameQueries, ListParams } from './api';
import { getSdk } from './operations.generated';

const useNameApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['name'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };
  const { client } = useGql();
  const queries = getNameQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};

export const useName = (nameId: string) => {
  const api = useNameApi();
  return useQuery(
    api.keys.detail(nameId || ''),
    () => api.get.byId(nameId || ''),
    {
      enabled: !!nameId,
    }
  );
};

export const useNames = (type: 'customer' | 'supplier') => {
  const api = useNameApi();
  const queryParams = useQueryParamsStore();
  return {
    ...useQuery(api.keys.paramList(queryParams.paramList()), () =>
      api.get.list({
        first: queryParams.pagination.first,
        offset: queryParams.pagination.offset,
        sortBy: queryParams.sort.sortBy,
        type: type === 'customer' ? 'customer' : 'supplier',
      })
    ),
    ...queryParams,
  };
};

export const useCustomers = () => {
  const api = useNameApi();
  const queryParams = useQueryParamsStore();

  return useQuery(api.keys.paramList(queryParams.paramList()), () =>
    api.get.customers(queryParams.paramList())
  );
};

export const useSuppliers = () => {
  const api = useNameApi();
  const queryParams = useQueryParamsStore();

  return useQuery(api.keys.paramList(queryParams.paramList()), () =>
    api.get.suppliers(queryParams.paramList())
  );
};

export const useInternalSuppliers = () => {
  const api = useNameApi();
  const queryParams = useQueryParamsStore();

  return useQuery(api.keys.paramList(queryParams.paramList()), () =>
    api.get.internalSuppliers(queryParams.paramList())
  );
};
