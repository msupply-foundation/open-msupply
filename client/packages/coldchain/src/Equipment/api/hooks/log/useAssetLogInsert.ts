import {
  InsertAssetLogInput,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetLogInsert = () => {
  const queryClient = useQueryClient();
  const api = useAssetApi();

  return useMutation(
    async (log: Partial<InsertAssetLogInput>) => api.insertLog(log),
    {
      onSettled: assetId =>
        queryClient.invalidateQueries(api.keys.logs(assetId ?? '')),
      onError: e => {
        console.error(e);
      },
    }
  );
};
