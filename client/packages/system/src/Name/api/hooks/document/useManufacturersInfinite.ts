import {
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

  return useInfiniteQuery(
    [...api.keys.list(), 'manufacturers', 'infinite', filter],
    async ({ pageParam }) => {
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
    { keepPreviousData: true }
  );
};
