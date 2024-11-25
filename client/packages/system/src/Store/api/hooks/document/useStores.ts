import {
  Pagination,
  useInfiniteQuery,
  useQueryParamsStore,
} from '@openmsupply-client/common';
import { useStoreApi } from '../utils/useStoreApi';

export const useStores = (pagination?: Pagination) => {
  const { sort, filter } = useQueryParamsStore();
  const { filterBy } = filter;
  const { sortBy } = sort;

  const api = useStoreApi();

  const params = {
    filterBy,
    first: 0,
    offset: 0,
    sortBy,
  };

  const query = useInfiniteQuery(
    api.keys.paramList(params),
    ({ pageParam }) => {
      console.log('pageparam', pageParam);
      return api.get.list({ ...params, ...pagination, ...pageParam });
    }
  );
  console.log('query:', query, 'page:', params);
  return query;
};

// no options, paginates but cant go up
//   const query = useInfiniteQuery(
//     api.keys.paramList(params),
//     async () => api.get.list({ ...params, ...pagination }),
//     { refetchOnWindowFocus: false, cacheTime: 0 }
//   );
//   console.log('query:', query);
//   return query;
// };
