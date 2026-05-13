import {
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

  return useInfiniteQuery(
    [...api.keys.list(), 'suppliers', 'infinite', external, filter],
    async ({ pageParam }) => {
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
    // Keep the previous filter's pages on screen while a new filter is in
    // flight, so the dropdown doesn't flash empty between keystrokes.
    { keepPreviousData: true }
  );
};

export const useSuppliersInfinite = (
  params: Omit<UseSuppliersInfiniteParams, 'external'>
) => useSuppliersInfiniteBase({ ...params, external: false });

export const useExternalSuppliersInfinite = (
  params: Omit<UseSuppliersInfiniteParams, 'external'>
) => useSuppliersInfiniteBase({ ...params, external: true });
