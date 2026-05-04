import { AssetLogFilterInput, useQuery } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetLogs = (
  assetId: string,
  additionalFilter?: Partial<AssetLogFilterInput>
) => {
  const api = useAssetApi();
  return useQuery(
    [...api.keys.logs(assetId), additionalFilter],
    () => api.get.logs(assetId, additionalFilter)
  );
};
