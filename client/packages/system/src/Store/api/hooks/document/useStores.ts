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

  return useQuery(api.keys.paramList(filterBy), async () =>
    api.get.list({
      filter: filterBy,
      first: 5000, // arbitrary large limit for now
      offset: 0,
    })
  );
};

interface useStoresProps {
  filter: FilterBy | null;
  rowsPerPage: number;
}

export const usePaginatedStores = ({ rowsPerPage, filter }: useStoresProps) => {
  const api = useStoreApi();

  const query = useInfiniteQuery(
    api.keys.paramList(filter),
    async ({ pageParam }) => {
      const pageNumber = Number(pageParam ?? 0);

      const data = await api.get.list({
        filter,
        first: rowsPerPage,
        offset: rowsPerPage * pageNumber,
      });

      return {
        data,
        pageNumber,
      };
    }
  );
  return query;
};
