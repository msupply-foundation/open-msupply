import {
  FilterController,
  LIST_KEY,
  useInfiniteQuery,
  useQuery,
  useQueryParamsStore,
} from '@openmsupply-client/common';
import { useStoreGraphQL } from '../useStockGraphQL';

const STORE = 'store';

export const useStoreList = () => {
  const { storeApi } = useStoreGraphQL();
  const { filter = { filterBy: null } } = useQueryParamsStore();
  const { filterBy } = filter;

  const queryKey = [STORE, LIST_KEY, filterBy];

  const queryFn = async () => {
    const query = await storeApi.stores({
      filter: filterBy,
      first: 5000, // arbitrary large limit for now
      offset: 0,
    });
    return query?.stores;
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });

  return query;
};

interface useStoresProps {
  filter?: FilterController;
  rowsPerPage: number;
}

export const usePaginatedStores = ({ rowsPerPage, filter }: useStoresProps) => {
  const { storeApi } = useStoreGraphQL();
  const queryKey = [STORE, LIST_KEY, filter?.filterBy];

  const query = useInfiniteQuery(queryKey, async ({ pageParam }) => {
    const pageNumber = Number(pageParam ?? 0);

    const data = await storeApi.stores({
      filter: filter?.filterBy ?? null,
      first: rowsPerPage,
      offset: rowsPerPage * pageNumber,
    });

    return {
      data: data?.stores,
      pageNumber,
    };
  });
  return query;
};
