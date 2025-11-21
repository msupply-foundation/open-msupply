import { ItemFilterInput, useInfiniteQuery } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';

type UseItemStockOnHandParams = {
  filter?: ItemFilterInput;
  rowsPerPage: number;
};

export const useItemStockOnHandInfinite = ({
  rowsPerPage,
  filter,
}: UseItemStockOnHandParams) => {
  const queryParams = {
    filterBy: filter,
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
  };

  const api = useItemApi();

  return useInfiniteQuery(
    api.keys.paramList({
      ...queryParams,
      // pagination cache managed by useInfiniteQuery, don't include in query keys
      // (default values for compiler)
      first: 0,
      offset: 0,
    }),
    async ({ pageParam }) => {
      const pageNumber = Number(pageParam ?? 0);

      const data = await api.get.itemStockOnHand({
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
      cacheTime: 5 * 60 * 1000,
      staleTime: 2 * 60 * 1000,
    }
  );
};
