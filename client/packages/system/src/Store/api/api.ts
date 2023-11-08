import { FilterBy } from '@openmsupply-client/common';
import { Sdk } from './operations.generated';

export type ListParams = {
  filterBy: FilterBy | null;
  first: number;
  offset: number;
};

export const getStoreQueries = (sdk: Sdk) => ({
  get: {
    list: async ({ filterBy, first, offset }: ListParams) => {
      const result = await sdk.stores({
        filter: filterBy,
        first,
        offset,
      });

      return result.stores;
    },
  },
});
