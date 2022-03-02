import { SortBy, NameSortFieldInput } from '@openmsupply-client/common';
import { Sdk, NameRowFragment } from './operations.generated';

export const getNameQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({
      type = 'supplier',
      first,
      offset,
      sortBy,
    }: {
      type?: 'supplier' | 'customer';
      first?: number;
      offset?: number;
      sortBy?: SortBy<NameRowFragment>;
    }): Promise<{
      nodes: NameRowFragment[];
      totalCount: number;
    }> => {
      const key =
        sortBy?.key === 'name'
          ? NameSortFieldInput.Name
          : NameSortFieldInput.Code;

      const result = await sdk.names({
        first,
        offset,
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: {
          [type === 'customer' ? 'isCustomer' : 'isSupplier']: true,
        },
      });

      return result.names;
    },
  },
});
