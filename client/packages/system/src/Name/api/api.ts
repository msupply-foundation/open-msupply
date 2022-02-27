import { SortBy, NameSortFieldInput, Name } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

type NameSdk = ReturnType<typeof getSdk>;

export const getNameQueries = (sdk: NameSdk, storeId: string) => ({
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
      sortBy?: SortBy<Name>;
    }): Promise<{
      nodes: Name[];
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
