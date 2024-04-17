import { useParams, useQuery } from '@openmsupply-client/common';
import { useItemApi } from './../useItemApi';

export const useItemId = () => {
  const { id = '' } = useParams();
  return id;
};

export const useItem = () => {
  const itemId = useItemId();
  return useItemById(itemId);
};

export const useItemById = (itemId: string | undefined) => {
  const api = useItemApi();
  return useQuery(
    api.keys.detail(itemId || ''),
    () => api.get.byId(itemId || ''),
    {
      enabled: !!itemId,
    }
  );
};
