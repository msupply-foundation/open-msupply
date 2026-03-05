import { useQuery } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetLogs = (assetId: string) => {
  const api = useAssetApi();
  return useQuery({
    queryKey: api.keys.logs(assetId),
    queryFn: () => api.get.logs(assetId)
  });
};
