import {
  keepPreviousData,
  NameFilterInput,
  useInfiniteQuery,
} from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

type UseManufacturersInfiniteParams = {
  rowsPerPage: number;
  filter?: NameFilterInput;
};

export const useManufacturersInfinite = ({
  rowsPerPage,
  filter,
}: UseManufacturersInfiniteParams) => {
  const api = useNameApi();

  const queryParams = {
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
    filter,
  };

  return useInfiniteQuery({
    queryKey: [...api.keys.list(), 'manufacturers', 'infinite', filter],
    queryFn: async ({ pageParam }) => {
      const pageNumber = Number(pageParam ?? 0);

      const data = await api.get.manufacturers({
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
    placeholderData: keepPreviousData,
  });
};
