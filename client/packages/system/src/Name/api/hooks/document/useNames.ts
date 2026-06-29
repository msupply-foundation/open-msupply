import {
  useQuery,
  keepPreviousData,
  useUrlQueryParams,
  buildPropertyUrlFilterConfigs,
  mapPropertyFilters,
} from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';
import { useNameCustomFields } from './useNameCustomFields';

export const useNames = (type: 'customer' | 'supplier') => {
  const { data: properties } = useNameCustomFields();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
    filters: buildPropertyUrlFilterConfigs(properties ?? []),
  });
  // Property filters travel to the API as the `dynamicFilter` condition AST
  const filterBy = mapPropertyFilters(queryParams.filterBy, properties ?? []);
  const api = useNameApi();
  return {
    ...useQuery({
      queryKey: api.keys.paramList(queryParams),

      queryFn: () =>
        api.get.list({
          first: queryParams.first,
          offset: queryParams.offset,
          sortBy: queryParams.sortBy,
          filterBy,
          type,
        }),

      placeholderData: keepPreviousData,
    }),
  };
};
