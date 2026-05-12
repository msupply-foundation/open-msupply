import {
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

  return useInfiniteQuery(
    [
      ...api.keys.list(),
      'customers',
      'infinite',
      filter,
    ],
    async ({ pageParam }) => {
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
    }
  );
};
