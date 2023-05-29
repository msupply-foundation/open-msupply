import { useQuery } from 'packages/common/src';
import { useRepackApi } from '../utils/useRepackApi';

export const useRepack = (invoiceId: string) => {
  const api = useRepackApi();

  const result = useQuery(
    api.keys.repack(invoiceId),
    () => api.get.repack(invoiceId),
    {
      onError: () => {},
    }
  );

  return { ...result };
};
