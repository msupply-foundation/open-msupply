import {
  InsertAssetInput,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetInsert = () => {
  const queryClient = useQueryClient();
  const api = useAssetApi();

  return useMutation(async (asset: InsertAssetInput) => api.insert(asset), {
    onSettled: () => queryClient.invalidateQueries(api.keys.base()),
    onError: e => {
      console.error(e);
    },
  });
};
