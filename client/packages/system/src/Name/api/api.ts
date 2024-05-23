import {
  SortBy,
  NameSortFieldInput,
  NameNodeType,
} from '@openmsupply-client/common';
import { Sdk, NameRowFragment } from './operations.generated';

export type ListParams = {
  type?: 'supplier' | 'customer' | 'facilities';
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
    byId: async (nameId: string) => {
      const result = await sdk.nameById({ storeId, nameId });
      const { names } = result;
      if (names.__typename === 'NameConnector') {
        if (names.nodes.length) {
          return names.nodes[0];
        }
      }

      throw new Error('Name not found');
    },
    internalSuppliers: async ({ sortBy }: ListParams) => {
      const key = nameParsers.toSort(sortBy?.key ?? '');

      const result = await sdk.names({
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: { isSupplier: true, isStore: true },
        first: 1000,
      });

      return result?.names;
    },
    suppliers: async ({ sortBy }: ListParams) => {
      const key = nameParsers.toSort(sortBy?.key ?? '');

      const result = await sdk.names({
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: {
          isSupplier: true,
          type: { equalAny: [NameNodeType.Facility, NameNodeType.Store] },
        },
        first: 1000,
      });

      return result?.names;
    },
    customers: async ({ sortBy }: ListParams) => {
      const key = nameParsers.toSort(sortBy?.key ?? '');

      const result = await sdk.names({
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: {
          isCustomer: true,
          type: { equalAny: [NameNodeType.Facility, NameNodeType.Store] },
        },
        first: 1000,
      });

      return result?.names;
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

      const typeFilter = {
        supplier: { isSupplier: true },
        customer: { isCustomer: true },
        facilities: {},
      }[type];

      const result = await sdk.names({
        first,
        offset,
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: {
          ...typeFilter,
          type: { equalAny: [NameNodeType.Facility, NameNodeType.Store] },
        },
      });

      return result?.names;
    },
  },
});
