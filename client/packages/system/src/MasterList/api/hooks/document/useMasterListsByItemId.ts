import { useQuery } from '@openmsupply-client/common';
import { useMasterListApi } from '../utils/useMasterListApi';

export const useMasterListsByItemId = (itemId: string) => {
  const api = useMasterListApi();

  return {
    ...useQuery(api.keys.base(), () => api.get.byItemId(itemId)),
  };
};
