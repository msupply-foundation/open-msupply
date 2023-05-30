import { useQuery } from 'packages/common/src';
import { useStockApi } from '../utils/useStockApi';

export const useRepacksByStockLine = (stockLineId: string) => {
  const api = useStockApi();

  const result = useQuery(api.keys.listRepackByStockLine(stockLineId), () =>
    api.get.repacksByStockLine(stockLineId)
  );

  return { ...result };
};
