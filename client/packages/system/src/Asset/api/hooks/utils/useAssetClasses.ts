import { useQuery } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetClasses = () => {
  const api = useAssetApi();
  return useQuery(api.keys.classes(), () => api.get.classes());
};
