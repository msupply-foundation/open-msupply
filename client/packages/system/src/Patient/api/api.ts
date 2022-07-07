import {
  SortBy,
  PatientSortFieldInput,
  InsertPatientInput,
  UpdatePatientInput,
  FilterBy,
  PatientSearchInput,
} from '@openmsupply-client/common';
import {
  Sdk,
  PatientRowFragment,
  PatientFragment,
} from './operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<PatientRowFragment>;
  filterBy?: FilterBy | null;
};

export const getPatientQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    byId: async (nameId: string) => {
      const result = await sdk.patientById({ storeId, nameId });
      const { patients } = result;
      if (patients.__typename === 'PatientConnector') {
        if (patients.nodes.length) {
          return patients.nodes[0];
        }
      }

      throw new Error('Name not found');
    },
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: ListParams): Promise<{
      nodes: PatientRowFragment[];
      totalCount: number;
    }> => {
      const key = sortBy?.key as PatientSortFieldInput;

      const result = await sdk.patients({
        first,
        offset,
        key,
        desc: !!sortBy?.isDesc,
        storeId,
        filter: filterBy,
      });

      return result?.patients;
    },
    listAll: async ({
      sortBy,
    }: ListParams): Promise<{
      nodes: PatientRowFragment[];
      totalCount: number;
    }> => {
      const key =
        sortBy?.key === 'name'
          ? PatientSortFieldInput.Name
          : PatientSortFieldInput.Code;

      const result = await sdk.patients({
        key,
        desc: !!sortBy?.isDesc,
        storeId,
      });

      return result?.patients;
    },
    search: async (
      input: PatientSearchInput
    ): Promise<{ score: number; patient: PatientFragment }[]> => {
      const result = await sdk.patientSearch({
        storeId,
        input,
      });

      if (result.patientSearch.__typename === 'PatientSearchConnector') {
        return result.patientSearch.nodes;
      }

      throw new Error('Could not search for patients');
    },
  },
  insertPatient: async (
    input: InsertPatientInput
  ): Promise<PatientRowFragment> => {
    const result = await sdk.insertPatient({
      storeId,
      input,
    });

    if (result.insertPatient.__typename === 'PatientNode') {
      return result.insertPatient;
    }

    throw new Error('Could not insert patient');
  },

  updatePatient: async (
    input: UpdatePatientInput
  ): Promise<PatientRowFragment> => {
    const result = await sdk.updatePatient({
      storeId,
      input,
    });

    if (result.updatePatient.__typename === 'PatientNode') {
      return result.updatePatient;
    }

    throw new Error('Could not update patient');
  },
});
