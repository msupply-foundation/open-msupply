import {
  useAuthContext,
  useQueryParams,
  useQuery,
} from '@openmsupply-client/common';
import { useItemApi } from './../useItemApi';
import { ItemRowFragment } from '../../operations.generated';
import { ItemQueries } from '../../api';

export const useItemListView = () => {
  const { storeId } = useAuthContext();
  const queryParams = useQueryParams<ItemRowFragment>({
    initialSortBy: { key: 'name' },
  });
  const api = useItemApi();

  return {
    ...useQuery(
      ['item', 'list', storeId, queryParams],
      ItemQueries.get.list(api, storeId, {
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
      })
    ),
    ...queryParams,
  };
};
