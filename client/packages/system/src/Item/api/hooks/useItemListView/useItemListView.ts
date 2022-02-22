import { useQueryParams, useQuery } from '@openmsupply-client/common';
import { useItemApi } from './../useItemApi';
import { ItemRowFragment } from '../../operations.generated';
import { ItemQueries } from '../../api';

export const useItemListView = () => {
  const queryParams = useQueryParams<ItemRowFragment>({
    initialSortBy: { key: 'name' },
  });
  const api = useItemApi();

  return {
    ...useQuery(
      ['item', 'list', queryParams],
      ItemQueries.get.list(api, {
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
      })
    ),
    ...queryParams,
  };
};
