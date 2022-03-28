import { useParams } from 'packages/common/src';
import { useQuery } from 'react-query';
import { useItemApi } from './../useItemApi';

export const useItemId = () => {
  const { id = '' } = useParams();
  return id;
};

export const useItem = (itemId?: string) => {
  const id = useItemId();
  const api = useItemApi();
  return useQuery(
    api.keys.detail(itemId ?? id),
    () => api.get.byId(itemId ?? id),
    {
      enabled: !!itemId,
    }
  );
};
