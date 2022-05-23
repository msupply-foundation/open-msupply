import { SortBy, NameSortFieldInput } from '@openmsupply-client/common';
import { Sdk, PatientRowFragment } from './operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<PatientRowFragment>;
};

export const getPatientQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    byId: async (nameId: string) => {
      const result = await sdk.patientById({ storeId, nameId });
      const { names } = result;
      if (names.__typename === 'NameConnector') {
        if (names.nodes.length) {
          return names.nodes[0];
        }
      }

      throw new Error('Name not found');
    },
    list: async ({
      first,
      offset,
      sortBy,
    }: ListParams): Promise<{
      nodes: PatientRowFragment[];
      totalCount: number;
    }> => {
      const key =
        sortBy?.key === 'name'
          ? NameSortFieldInput.Name
          : NameSortFieldInput.Code;

      const result = await sdk.patients({
        first,
        offset,
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: {
          isCustomer: true,
        },
      });

      return result?.names;
    },
    listAll: async ({
      sortBy,
    }: ListParams): Promise<{
      nodes: PatientRowFragment[];
      totalCount: number;
    }> => {
      const key =
        sortBy?.key === 'name'
          ? NameSortFieldInput.Name
          : NameSortFieldInput.Code;

      const result = await sdk.patients({
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: {
          isCustomer: true,
        },
      });

      return result?.names;
    },
  },
});
