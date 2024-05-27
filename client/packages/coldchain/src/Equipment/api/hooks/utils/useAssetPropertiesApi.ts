import { getAssetPropertyQueries } from '../../api';
import {
  AssetPropertyFilterInput,
  useAuthContext,
  useGql,
} from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';

export const useAssetPropertiesApi = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['asset_properties'] as const,
    paramList: (filter: AssetPropertyFilterInput) =>
      [...keys.base(), filter] as const,
  };

  const queries = getAssetPropertyQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};
