import {
  keepPreviousData,
  NameFilterInput,
  useInfiniteQuery,
} from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

type UseInternalSuppliersInfiniteParams = {
  rowsPerPage: number;
  filter?: NameFilterInput;
};

export const useInternalSuppliersInfinite = ({
  rowsPerPage,
  filter,
}: UseInternalSuppliersInfiniteParams) => {
  const api = useNameApi();

  const queryParams = {
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
    filter,
  };

  return useInfiniteQuery({
    queryKey: [...api.keys.list(), 'internalSuppliers', 'infinite', filter],
    queryFn: async ({ pageParam }) => {
      const pageNumber = Number(pageParam ?? 0);

      const data = await api.get.internalSuppliers({
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
