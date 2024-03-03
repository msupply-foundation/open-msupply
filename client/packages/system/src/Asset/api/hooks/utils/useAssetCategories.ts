import { useQuery } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetCategories = () => {
  const api = useAssetApi();
  return useQuery(api.keys.categories(), () => api.get.categories());
};
