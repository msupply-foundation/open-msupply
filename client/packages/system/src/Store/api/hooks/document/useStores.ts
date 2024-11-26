import {
  FilterController,
  useInfiniteQuery,
  useQuery,
  useQueryParamsStore,
} from '@openmsupply-client/common';
import { useStoreApi } from '../utils/useStoreApi';

export const useStores = () => {
  const api = useStoreApi();
  const { filter } = useQueryParamsStore();
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
  filter?: FilterController;
  rowsPerPage: number;
}

export const usePaginatedStores = ({ rowsPerPage, filter }: useStoresProps) => {
  const api = useStoreApi();

  const query = useInfiniteQuery(
    api.keys.paramList(filter?.filterBy ?? null),
    async ({ pageParam }) => {
      const pageNumber = Number(pageParam ?? 0);

      const data = await api.get.list({
        filter: filter?.filterBy ?? null,
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
