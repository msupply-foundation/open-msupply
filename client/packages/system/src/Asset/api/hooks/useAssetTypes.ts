import {
  AssetTypeSortFieldInput,
  FilterByWithBoolean,
  useQuery,
} from '@openmsupply-client/common';
import { useAssetGraphQL } from '../useAssetGraphQL';
import { ASSET, TYPES } from './keys';

export const useAssetTypes = (filterBy?: FilterByWithBoolean | null) => {
  const { assetApi, storeId } = useAssetGraphQL();
  const queryKey = [ASSET, storeId, TYPES, filterBy];

  const queryFn = async () => {
    const query = await assetApi.assetTypes({
      filter: filterBy,
      sort: { key: AssetTypeSortFieldInput.Name, desc: false },
    });

    const { nodes, totalCount } = query?.assetTypes;
    return { nodes, totalCount };
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};
