import { AssetTypeFilterInput, useQuery } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetTypes = (filter?: AssetTypeFilterInput) => {
  const api = useAssetApi();
  return useQuery(api.keys.types(filter), () => api.get.types(filter));
};
