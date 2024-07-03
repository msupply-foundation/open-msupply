import { useQueryParamsStore, useQuery } from '@openmsupply-client/common';
import { useStoreApi } from '../utils/useStoreApi';

export const useStores = () => {
  const api = useStoreApi();
  const queryParams = useQueryParamsStore();
  const { filter, pagination } = queryParams;
  const { filterBy } = filter;
  const { first, offset } = pagination;

  return useQuery(api.keys.paramList(queryParams.paramList()), async () =>
    api.get.list({ filterBy, first, offset })
  );
};
