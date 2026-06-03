import {
  keepPreviousData,
  NameFilterInput,
  useInfiniteQuery,
} from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

type UseSuppliersInfiniteParams = {
  rowsPerPage: number;
  filter?: NameFilterInput;
  external?: boolean;
};

const useSuppliersInfiniteBase = ({
  rowsPerPage,
  filter,
  external,
}: UseSuppliersInfiniteParams) => {
  const api = useNameApi();

  const queryParams = {
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
    filter,
  };

  return useInfiniteQuery({
    queryKey: [
      ...api.keys.list(),
      'suppliers',
      'infinite',
      external,
      filter,
    ],
    queryFn: async ({ pageParam }) => {
      const pageNumber = Number(pageParam ?? 0);

      const data = await api.get.suppliers({
        ...queryParams,
        first: rowsPerPage,
        offset: rowsPerPage * pageNumber,
        external,
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
    // flight, so the dropdown doesn't flash empty between keystrokes.
    placeholderData: keepPreviousData,
  });
};

export const useSuppliersInfinite = (
  params: Omit<UseSuppliersInfiniteParams, 'external'>
) => useSuppliersInfiniteBase({ ...params, external: false });

export const useExternalSuppliersInfinite = (
  params: Omit<UseSuppliersInfiniteParams, 'external'>
) => useSuppliersInfiniteBase({ ...params, external: true });
