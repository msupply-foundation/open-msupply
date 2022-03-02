import { useQuery } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';

export const useItemsWithStats = () => {
  const api = useItemApi();

  return useQuery(['item', 'list', 'stats'], api.get.listWithStats);
};
