import { useQuery } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';

export const useItemsWithStats = () => {
  const api = useItemApi();

  return useQuery(api.keys.list(), api.get.listWithStats);
};
