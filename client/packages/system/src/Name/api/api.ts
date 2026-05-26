import {
  SortBy,
  NameSortFieldInput,
  NameNodeType,
  FilterBy,
  UpdateNamePropertiesInput,
  NameFilterInput,
} from '@openmsupply-client/common';
import {
  Sdk,
  NameRowFragment,
  FacilityNameRowFragment,
  UpdateNamePropertiesMutation,
} from './operations.generated';

export type ListParams = {
  type?: 'supplier' | 'customer';
  first?: number;
  offset?: number;
  sortBy?: SortBy<NameRowFragment>;
  filterBy?: FilterBy | null;
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
    internalSuppliers: async ({
      first,
      offset,
      sortBy,
      filter,
    }: {
      first?: number;
      offset?: number;
      sortBy?: SortBy<NameRowFragment>;
      filter?: NameFilterInput | null;
    } = {}) => {
      const key = nameParsers.toSort(sortBy?.key ?? '');

      const result = await sdk.names({
        first,
        offset,
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: { isSupplier: true, isStore: true, ...filter },
      });

      return result?.names;
    },
    donors: async ({
      first,
      offset,
      sortBy,
      filter,
    }: {
      first?: number;
      offset?: number;
      sortBy?: SortBy<NameRowFragment>;
      filter?: NameFilterInput | null;
    } = {}) => {
      const key = nameParsers.toSort(sortBy?.key ?? '');

      const result = await sdk.names({
        first,
        offset,
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: { isDonor: true, isVisible: true, ...filter },
      });

      return result?.names;
    },
    suppliers: async ({
      first,
      offset,
      sortBy,
      filter,
      external = false,
    }: {
      first?: number;
      offset?: number;
      sortBy?: SortBy<NameRowFragment>;
      filter?: NameFilterInput | null;
      external?: boolean;
    } & ListParams = {}) => {
      const key = nameParsers.toSort(sortBy?.key ?? '');

      const baseFilter: NameFilterInput = {
        isSupplier: true,
        type: {
          equalAny: external
            ? [NameNodeType.Facility]
            : [NameNodeType.Facility, NameNodeType.Store],
        },
      };

      const result = await sdk.names({
        first,
        offset,
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: { ...baseFilter, ...filter },
      });

      return result?.names;
    },
    manufacturers: async ({
      first,
      offset,
      sortBy,
      filter,
    }: {
      first?: number;
      offset?: number;
      sortBy?: SortBy<NameRowFragment>;
      filter?: NameFilterInput | null;
    } = {}) => {
      const key = nameParsers.toSort(sortBy?.key ?? '');

      const result = await sdk.names({
        first,
        offset,
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: {
          isVisible: true,
          isManufacturer: true,
          ...filter,
        },
      });

      return result?.names;
    },
    customers: async ({
      first,
      offset,
      sortBy,
      filter,
    }: {
      first?: number;
      offset?: number;
      sortBy?: SortBy<NameRowFragment>;
      filter?: NameFilterInput | null;
    } = {}) => {
      const key = nameParsers.toSort(sortBy?.key ?? '');

      const result = await sdk.names({
        first,
        offset,
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: {
          isCustomer: true,
          type: { equalAny: [NameNodeType.Facility, NameNodeType.Store] },
          ...filter,
        },
      });

      return result?.names;
    },
    stores: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: {
      offset?: number;
      first?: number;
      sortBy?: SortBy<NameRowFragment>;
      filterBy?: FilterBy | null;
    }): Promise<{
      nodes: FacilityNameRowFragment[];
      totalCount: number;
    }> => {
      const key =
        sortBy?.key === 'name'
          ? NameSortFieldInput.Name
          : NameSortFieldInput.Code;

      const result = await sdk.facilities({
        first,
        offset,
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: {
          ...filterBy,
          isStore: true,
        },
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

      const result = await sdk.names({
        first,
        offset,
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: {
          [type === 'customer' ? 'isCustomer' : 'isSupplier']: true,
          type: { equalAny: [NameNodeType.Facility, NameNodeType.Store] },
        },
      });

      return result?.names;
    },
    properties: async () => {
      const result = await sdk.nameProperties();

      if (result?.nameProperties?.__typename === 'NamePropertyConnector') {
        return result?.nameProperties?.nodes;
      }
      throw new Error('Unable to fetch properties');
    },
  },
  updateNameProperties: async (
    input: UpdateNamePropertiesInput
  ): Promise<UpdateNamePropertiesMutation> => {
    const result = await sdk.updateNameProperties({ storeId, input });

    if (result.updateNameProperties.__typename === 'NameNode') {
      return result;
    }

    throw new Error(result.updateNameProperties.error.description);
  },
});
