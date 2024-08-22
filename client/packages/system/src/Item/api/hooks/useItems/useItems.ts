import { useQuery } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';
import { ListParams } from '../../api';
import { ItemRowFragment } from '../..';

export const useItems = (queryParams: ListParams<ItemRowFragment>) => {
  const api = useItemApi();
  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.stockItemsWithStats(queryParams)
  );
};
