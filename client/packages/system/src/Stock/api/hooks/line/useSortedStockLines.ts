import {
  SortBy,
  StockLineNode,
  useQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useStockApi } from '../utils/useStockApi';

export const useSortedStockLines = (sortBy: SortBy<StockLineNode>) => {
  const { queryParams } = useUrlQueryParams();

  const api = useStockApi();
  const result = useQuery(
    api.keys.sortedList(sortBy),
    () =>
      api.get.list({
        ...queryParams,
        sortBy,
      }),
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  return { ...result };
};
