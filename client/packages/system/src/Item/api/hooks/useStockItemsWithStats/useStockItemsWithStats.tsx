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
  return useInfiniteQuery({
    queryKey: api.keys.paramList({ ...queryParams, first: 0, offset: 0 }),
    queryFn: async ({ pageParam }) => {
      const pageNumber = Number(pageParam);
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
    initialPageParam: 0,
    getNextPageParam: lastPage =>
      (lastPage.pageNumber + 1) * rowsPerPage < (lastPage.data?.totalCount ?? 0)
        ? lastPage.pageNumber + 1
        : undefined,
    refetchOnWindowFocus: false,
    gcTime: 0,
  });
};
