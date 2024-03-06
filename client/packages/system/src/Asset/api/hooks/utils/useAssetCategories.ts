import { AssetCategoryFilterInput, useQuery } from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetCategories = (filter?: AssetCategoryFilterInput) => {
  const api = useAssetApi();
  return useQuery(api.keys.categories(), () => api.get.categories(filter));
};
