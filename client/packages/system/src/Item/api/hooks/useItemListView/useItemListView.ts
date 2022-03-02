import {
  useAuthContext,
  useQueryParams,
  useQuery,
} from '@openmsupply-client/common';
import { useItemApi } from './../useItemApi';
import { ItemRowFragment } from '../../operations.generated';

export const useItemListView = () => {
  const { storeId } = useAuthContext();
  const queryParams = useQueryParams<ItemRowFragment>({
    initialSortBy: { key: 'name' },
  });
  const api = useItemApi();

  return {
    ...useQuery(
      ['item', 'list', storeId, queryParams],
      api.get.list({
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
      })
    ),
    ...queryParams,
  };
};
