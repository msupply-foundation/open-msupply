import { useQuery } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetTypes = () => {
  const api = useAssetApi();
  return useQuery(api.keys.types(), () => api.get.types());
};
