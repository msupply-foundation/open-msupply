import { FilterBy } from '@openmsupply-client/common';
import { Sdk } from './operations.generated';

export const getStoreQueries = (sdk: Sdk) => ({
  get: {
    list: async ({
      filter,
      first,
      offset,
    }: {
      filter: FilterBy | null;
      first: number;
      offset: number;
    }) => {
      const result = await sdk.stores({
        filter,
        first,
        offset,
      });

      return result.stores;
    },
  },
});
