import {
  useQueryParams,
  useGql,
  useAuthContext,
  useQuery,
} from '@openmsupply-client/common';
import { getNameQueries, ListParams } from './api';
import { getSdk, NameRowFragment } from './operations.generated';

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
  const queryParams = useQueryParams<NameRowFragment>({
    initialSortBy: { key: 'name' },
  });
  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list({
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
        type: type === 'customer' ? 'customer' : 'supplier',
      })
    ),
    ...queryParams,
  };
};

export const useCustomers = () => {
  const api = useNameApi();
  const queryParams = useQueryParams<NameRowFragment>({
    initialSortBy: { key: 'name' },
  });

  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.customers(queryParams)
  );
};

export const useSuppliers = () => {
  const api = useNameApi();
  const queryParams = useQueryParams<NameRowFragment>({
    initialSortBy: { key: 'name' },
  });

  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.suppliers(queryParams)
  );
};

export const useInternalSuppliers = () => {
  const api = useNameApi();
  const queryParams = useQueryParams<NameRowFragment>({
    initialSortBy: { key: 'name' },
  });

  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.internalSuppliers(queryParams)
  );
};
