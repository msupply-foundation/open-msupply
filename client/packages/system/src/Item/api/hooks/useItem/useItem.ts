import { useQuery } from 'react-query';
import { useItemApi } from './../useItemApi';

export const useItem = (itemId: string | undefined) => {
  const api = useItemApi();
  return useQuery(['item', itemId], () => api.get.byId(itemId ?? ''), {
    enabled: !!itemId,
  });
};
