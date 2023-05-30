import { useQuery } from 'packages/common/src';
import { useStockApi } from '../utils/useStockApi';

export const useRepack = (invoiceId: string) => {
  const api = useStockApi();

  const result = useQuery(
    api.keys.repack(invoiceId),
    () => api.get.repack(invoiceId),
    {
      onError: () => {},
    }
  );

  return { ...result };
};
