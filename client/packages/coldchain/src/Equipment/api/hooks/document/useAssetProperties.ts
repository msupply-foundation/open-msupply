import { AssetPropertyFilterInput, useQuery } from '@openmsupply-client/common';
import { useAssetPropertiesApi } from '../utils/useAssetPropertiesApi';

export const useAssetProperties = (filter: AssetPropertyFilterInput) => {
  const api = useAssetPropertiesApi();
  return useQuery(api.keys.paramList(filter), () => api.get.list(filter));
};
