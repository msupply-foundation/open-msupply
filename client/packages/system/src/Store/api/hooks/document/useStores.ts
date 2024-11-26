import {
  FilterController,
  Pagination,
  SortController,
  useInfiniteQuery,
} from '@openmsupply-client/common';
import { useStoreApi } from '../utils/useStoreApi';

interface useStoresProps {
  sort: SortController<any>;
  filter: FilterController;
  pagination?: Pagination;
}

export const useStores = ({ pagination, sort, filter }: useStoresProps) => {
  // const { first, offset } = pagination;

  const api = useStoreApi();

  const params = {
    filterBy: filter.filterBy,
    sortBy: sort,
  };

  const query = useInfiniteQuery(
    api.keys.paramList(params),
    ({ pageParam }) => {
      console.log('running query useStores:');
      console.log('pageparam', pageParam);
      return api.get.list({ ...params, ...pagination, ...pageParam });
    },
    {}
  );
  return query;
};

//   return useInfiniteQuery(api.keys.paramList(params), ({ pageParam }) =>
//     api.get.list({ ...params, ...pagination, ...pageParam })
//   );
// };
