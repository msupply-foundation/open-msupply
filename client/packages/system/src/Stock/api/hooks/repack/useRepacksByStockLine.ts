import { useQuery } from 'packages/common/src';
import { useRepackApi } from '../utils/useRepackApi';

export const useRepacksByStockLine = (stockLineId: string) => {
  const api = useRepackApi();

  const result = useQuery(api.keys.listByStockLine(stockLineId), () =>
    api.get.repacksByStockLine(stockLineId)
  );

  return { ...result };
};
