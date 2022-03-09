import { useQueryParams, useQuery } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';
import { ItemRowFragment } from '../../operations.generated';

export const useItems = () => {
  const queryParams = useQueryParams<ItemRowFragment>({
    initialSortBy: { key: 'name' },
  });
  const api = useItemApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), api.get.list(queryParams)),
    ...queryParams,
  };
};
