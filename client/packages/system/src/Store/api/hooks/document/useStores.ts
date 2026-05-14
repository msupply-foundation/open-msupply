import {
  FilterBy,
  useInfiniteQuery,
  useQuery,
  useQueryParamsStore,
} from '@openmsupply-client/common';
import { useStoreApi } from '../utils/useStoreApi';

export const useStores = () => {
  const api = useStoreApi();
  const { filter = { filterBy: null } } = useQueryParamsStore();
  const { filterBy } = filter;

  return useQuery({
    queryKey: api.keys.paramList(filterBy),
    queryFn: async () =>
      api.get.list({
        filter: filterBy,
        first: 5000, // arbitrary large limit for now
        offset: 0,
      }),
  });
};

interface useStoresProps {
  filter: FilterBy | null;
  rowsPerPage: number;
}

export const usePaginatedStores = ({ rowsPerPage, filter }: useStoresProps) => {
  const api = useStoreApi();

  const query = useInfiniteQuery({
    queryKey: api.keys.paramList(filter),
    queryFn: async ({ pageParam }) => {
      const pageNumber = Number(pageParam);

      const data = await api.get.list({
        filter,
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
  });
  return query;
};
