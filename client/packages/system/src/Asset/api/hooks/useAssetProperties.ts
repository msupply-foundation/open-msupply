import { FilterBy, useQuery } from '@openmsupply-client/common';
import { useAssetGraphQL } from '../useAssetGraphQL';
import { ASSET, PROPERTIES } from './keys';

export const useAssetProperties = (filterBy?: FilterBy | null) => {
  const { assetApi, storeId } = useAssetGraphQL();
  const queryKey = [ASSET, storeId, PROPERTIES, filterBy];

  const queryFn = async () => {
    const query = await assetApi.assetProperties({
      filter: filterBy,
    });

    if (query?.assetProperties?.__typename === 'AssetPropertyConnector') {
      return query?.assetProperties?.nodes;
    }
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};
