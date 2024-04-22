import { useMutation, useQueryClient } from '@openmsupply-client/common/src';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetLogReasonsDelete = () => {
  const api = useAssetApi();
  const queryClient = useQueryClient();

  return useMutation(api.deleteLogReason, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.logReasons()),
  });
};
