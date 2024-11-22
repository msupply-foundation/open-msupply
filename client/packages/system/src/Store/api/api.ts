import { FilterByWithBoolean, SortBy } from '@common/hooks';
import { Sdk, StoreRowFragment } from './operations.generated';

export type StoreListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<StoreRowFragment>;
  filterBy: FilterByWithBoolean | null;
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
