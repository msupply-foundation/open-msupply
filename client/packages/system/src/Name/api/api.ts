import { SortBy, NameSortFieldInput } from '@openmsupply-client/common';
import { Sdk, NameRowFragment } from './operations.generated';

export type ListParams = {
  type?: 'supplier' | 'customer';
  first?: number;
  offset?: number;
  sortBy?: SortBy<NameRowFragment>;
};

const nameParsers = {
  toSort: (key: string) => {
    if (key === NameSortFieldInput.Name) return NameSortFieldInput.Name;
    if (key === NameSortFieldInput.Code) return NameSortFieldInput.Code;
    return NameSortFieldInput.Name;
  },
};

export const getNameQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    internalSuppliers: async ({ sortBy }: ListParams) => {
      const result = await getNameQueries(sdk, storeId).get.suppliers({
        sortBy,
      });

      const internalSuppliers = result.nodes.filter(({ store }) => !!store);
      return internalSuppliers;
    },
    suppliers: async ({ sortBy }: ListParams) => {
      const key = nameParsers.toSort(sortBy?.key ?? '');

      const result = await sdk.names({
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: { isSupplier: true },
      });

      return result.names;
    },
    customers: async ({ sortBy }: ListParams) => {
      const key = nameParsers.toSort(sortBy?.key ?? '');

      const result = await sdk.names({
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: { isCustomer: true },
      });

      return result.names;
    },

    list: async ({
      type = 'supplier',
      first,
      offset,
      sortBy,
    }: ListParams): Promise<{
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
