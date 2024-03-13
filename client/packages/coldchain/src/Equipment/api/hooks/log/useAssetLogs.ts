import { useQuery } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetLogs = (assetId: string) => {
  const api = useAssetApi();
  return useQuery(api.keys.logs(assetId), () => api.get.logs(assetId));
};
