import { FilterBy } from '@common/hooks';
import { Sdk } from './operations.generated';

export type StoreListParams = {
  first?: number;
  offset?: number;
  filter: FilterBy | null;
};

export const getStoreQueries = (sdk: Sdk) => ({
  get: {
    list: async ({ ...params }: StoreListParams) => {
      const result = await sdk.stores({
        ...params,
      });

      return result.stores;
    },
  },
});
