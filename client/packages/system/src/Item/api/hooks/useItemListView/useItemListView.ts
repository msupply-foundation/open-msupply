import { useQueryParams, useQuery } from '@openmsupply-client/common';
import { useItemApi } from './../useItemApi';
import { ItemRowFragment } from '../../operations.generated';

export const useItemListView = () => {
  const queryParams = useQueryParams<ItemRowFragment>({
    initialSortBy: { key: 'name' },
  });
  const api = useItemApi();

  return {
    ...useQuery(
      api.keys.paramList(queryParams),
      api.get.list({
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
      })
    ),
    ...queryParams,
  };
};
