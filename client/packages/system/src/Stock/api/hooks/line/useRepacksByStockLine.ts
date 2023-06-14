import { useQuery } from '@openmsupply-client/common';
import { useStockApi } from '../utils/useStockApi';

export const useRepacksByStockLine = (stockLineId: string) => {
  const api = useStockApi();

  return useQuery(api.keys.listRepackByStockLine(stockLineId), () =>
    api.get.repacksByStockLine(stockLineId)
  );
};
