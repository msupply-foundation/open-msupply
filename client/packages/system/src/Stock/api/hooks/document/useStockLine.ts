import { useQuery } from '@openmsupply-client/common';
import { useStockApi } from '../utils/useStockApi';

export const useStockLine = (id: string) => {
  const api = useStockApi();
  return {
    ...useQuery(api.keys.detail(id), () => api.get.byId(id)),
  };
};
