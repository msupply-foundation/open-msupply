import {
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

  return useInfiniteQuery(
    [...api.keys.list(), 'internalSuppliers', 'infinite', filter],
    async ({ pageParam }) => {
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
    { keepPreviousData: true }
  );
};
