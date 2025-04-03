import {
  AssetTypeSortFieldInput,
  AssetTypeFilterInput,
} from '@openmsupply-client/common';
import { Sdk } from './operations.generated';

export const getAssetQueries = (sdk: Sdk) => ({
  get: {
    types: async (filter: AssetTypeFilterInput | undefined) => {
      const result = await sdk.assetTypes({
        filter,
        sort: { key: AssetTypeSortFieldInput.Name, desc: false },
      });
      const types = result?.assetTypes;

      return types;
    },
  },
});
