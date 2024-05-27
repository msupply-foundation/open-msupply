import { AssetPropertyFilterInput, useQuery } from '@openmsupply-client/common';
import { useAssetApi } from './useAssetApi';

export const useAssetProperties = (filter?: AssetPropertyFilterInput) => {
  const api = useAssetApi();
  return useQuery(api.keys.properties(filter), () =>
    api.get.properties(filter)
  );
};
