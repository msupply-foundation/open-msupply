import {
  AssetCategorySortFieldInput,
  FilterByWithBoolean,
  useQuery,
} from '@openmsupply-client/common';
import { useAssetGraphQL } from '../useAssetGraphQL';
import { ASSET, CATEGORIES } from './keys';

export const useAssetCategories = (filterBy?: FilterByWithBoolean | null) => {
  const { assetApi, storeId } = useAssetGraphQL();
  const queryKey = [ASSET, storeId, CATEGORIES, filterBy];

  const queryFn = async () => {
    const query = await assetApi.assetCategories({
      filter: filterBy,
      sort: { key: AssetCategorySortFieldInput.Name, desc: false },
    });

    const { nodes, totalCount } = query?.assetCategories;
    return { nodes, totalCount };
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};
