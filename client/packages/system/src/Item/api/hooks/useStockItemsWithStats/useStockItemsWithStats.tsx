import {
  ItemNodeType,
  useQuery,
  useQueryParams,
} from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';

export const useStockItemsWithStats = () => {
  const queryParams = useQueryParams({ initialSortBy: { key: 'name' } });
  const filter = {
    ...queryParams,
    filterBy: { type: { equalTo: ItemNodeType.Stock } },
  };
  const api = useItemApi();
  return useQuery(api.keys.paramList(filter), () =>
    api.get.stockItemsWithStats(filter)
  );
};
