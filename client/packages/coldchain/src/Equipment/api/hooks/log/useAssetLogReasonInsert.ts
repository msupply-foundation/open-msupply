import {
  InsertAssetLogReasonInput,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetLogReasonInsert = () => {
  const queryClient = useQueryClient();
  const api = useAssetApi();

  return useMutation(
    async (log: Partial<InsertAssetLogReasonInput>) => api.insertLogReason(log),
    {
      onSettled: () => queryClient.invalidateQueries(api.keys.base()),
      onError: e => {
        console.error(e);
      },
    }
  );
};
