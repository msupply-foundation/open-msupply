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
    async (log: InsertAssetLogReasonInput) => api.insertLogReason(log),
    {
      onSettled: () => queryClient.invalidateQueries(api.keys.logReasons()),
      onError: e => {
        console.error(e);
      },
    }
  );
};
