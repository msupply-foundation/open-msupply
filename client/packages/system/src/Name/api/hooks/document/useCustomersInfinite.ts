import {
  keepPreviousData,
  NameFilterInput,
  useInfiniteQuery,
} from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

type UseCustomersInfiniteParams = {
  rowsPerPage: number;
  filter?: NameFilterInput;
};

export const useCustomersInfinite = ({
  rowsPerPage,
  filter,
}: UseCustomersInfiniteParams) => {
  const api = useNameApi();

  const queryParams = {
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
    filter,
  };

  return useInfiniteQuery({
    queryKey: [
      ...api.keys.list(),
      'customers',
      'infinite',
      filter,
    ],
    queryFn: async ({ pageParam }) => {
      const pageNumber = Number(pageParam ?? 0);

      const data = await api.get.customers({
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
    // Keep the previous filter's pages on screen while a new filter is in
    // flight, so the dropdown doesn't flash empty/"Loading..." between
    // keystrokes — InfiniteSearchPicker also relies on this for its
    // client-side narrowing fallback.
    placeholderData: keepPreviousData,
  });
};
