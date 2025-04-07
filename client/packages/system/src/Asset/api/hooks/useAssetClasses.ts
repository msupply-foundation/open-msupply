import { AssetClassSortFieldInput, useQuery } from '@openmsupply-client/common';
import { useAssetGraphQL } from '../useAssetGraphQL';
import { ASSET, CLASSES } from './keys';

export const useAssetClasses = () => {
  const { assetApi, storeId } = useAssetGraphQL();
  const queryKey = [ASSET, storeId, CLASSES];

  const queryFn = async () => {
    const query = await assetApi.assetClasses({
      sort: { key: AssetClassSortFieldInput.Name, desc: false },
    });

    const { nodes, totalCount } = query?.assetClasses;
    return { nodes, totalCount };
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};
