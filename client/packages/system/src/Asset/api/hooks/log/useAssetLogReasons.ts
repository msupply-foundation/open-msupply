import { useQuery } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetLogReasons = (storeId?: string | undefined) => {
  const id = storeId ?? '';
  const api = useAssetApi();
  return useQuery(api.keys.logReasons(), () => api.get.logReasons(id));
};
