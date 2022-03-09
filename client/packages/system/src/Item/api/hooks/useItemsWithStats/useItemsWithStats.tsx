import { useQuery, useQueryParams } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';

export const useItemsWithStats = () => {
  const queryParams = useQueryParams({ initialSortBy: { key: 'name' } });
  const filter = { ...queryParams, filterBy: { type: { equalTo: 'SErvice' } } };
  const api = useItemApi();
  return useQuery(api.keys.paramList(filter), () =>
    api.get.itemsWithStats(filter)
  );
};
