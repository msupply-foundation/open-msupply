import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

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
