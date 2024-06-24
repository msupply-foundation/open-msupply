import { useQueryParamsStore, useQuery } from '@openmsupply-client/common';
import { useStoreApi } from '../utils/useStoreApi';

export const useStores = () => {
  const api = useStoreApi();
  const queryParams = useQueryParamsStore();
  const { filter } = queryParams;
  const { filterBy } = filter;

  return useQuery(api.keys.paramList(filterBy), async () =>
    api.get.list(filterBy)
  );
};
