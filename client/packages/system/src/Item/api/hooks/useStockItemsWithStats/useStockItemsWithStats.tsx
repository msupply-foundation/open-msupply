import { ItemNodeType, useInfiniteQuery } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';

export const useStockItemsWithStats = ({ rowsPerPage = 20, filter = {} }) => {
  const queryParams = {
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
    offset: 0,
    first: rowsPerPage,
    filterBy: { ...filter, type: { equalTo: ItemNodeType.Stock } },
  };
  const api = useItemApi();
  return useInfiniteQuery(
    api.keys.paramList({ ...queryParams, first: 0, offset: 0 }),
    async ({ pageParam }) => {
      const pageNumber = Number(pageParam ?? 0);
      const data = await api.get.stockItemsWithStats({
        ...queryParams,
        first: rowsPerPage,
        offset: rowsPerPage * pageNumber,
      });
      return {
        data,
        pageNumber,
      };
    },
    {
      refetchOnWindowFocus: false,
      cacheTime: 0,
    }
  );
};
