import {
  AssetCataloguePropertyFilterInput,
  useQuery,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetCatalogueProperties = (
  filter?: AssetCataloguePropertyFilterInput
) => {
  const api = useAssetApi();
  return useQuery(api.keys.properties(filter), () =>
    api.get.properties(filter)
  );
};
