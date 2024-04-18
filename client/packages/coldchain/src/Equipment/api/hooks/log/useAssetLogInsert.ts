import {
  InsertAssetLogInput,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetLogInsert = () => {
  const queryClient = useQueryClient();
  const api = useAssetApi();

  const { mutateAsync } = useMutation(
    async (log: Partial<InsertAssetLogInput>) => api.insertLog(log),
    {
      onError: e => {
        console.error(e);
      },
    }
  );

  return {
    insertLog: mutateAsync,
    invalidateQueries: () => queryClient.invalidateQueries(api.keys.base()),
  };
};
