import { FilterByWithBoolean } from '@openmsupply-client/common';
import { Sdk } from './operations.generated';

export const getStoreQueries = (sdk: Sdk) => ({
  get: {
    list: async (filterBy: FilterByWithBoolean | null) => {
      const result = await sdk.stores({
        filter: filterBy,
      });

      return result.stores;
    },
  },
});
