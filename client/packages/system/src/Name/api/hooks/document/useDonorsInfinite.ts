import {
  NameFilterInput,
  useInfiniteQuery,
} from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

type UseDonorsInfiniteParams = {
  rowsPerPage: number;
  filter?: NameFilterInput;
};

export const useDonorsInfinite = ({
  rowsPerPage,
  filter,
}: UseDonorsInfiniteParams) => {
  const api = useNameApi();

  const queryParams = {
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
    filter,
  };

  return useInfiniteQuery(
    [...api.keys.donors(), 'infinite', filter],
    async ({ pageParam }) => {
      const pageNumber = Number(pageParam ?? 0);

      const data = await api.get.donors({
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
