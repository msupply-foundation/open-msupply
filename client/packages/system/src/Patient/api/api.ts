import {
  SortBy,
  PatientSortFieldInput,
  InsertPatientInput,
  UpdatePatientInput,
  FilterBy,
  PatientSearchInput,
  ProgramEnrolmentSortFieldInput,
  SortRule,
  EncounterSortFieldInput,
  PaginationInput,
  CentralPatientSearchInput,
  InsertProgramPatientInput,
  UpdateProgramPatientInput,
  FilterByWithBoolean,
} from '@openmsupply-client/common';
import {
  Sdk,
  PatientRowFragment,
  CentralPatientSearchQuery,
  LinkPatientToStoreMutation,
  ProgramPatientRowFragment,
  LatestPatientEncounterQuery,
} from './operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<PatientRowFragment>;
  filterBy?: FilterByWithBoolean | null;
};

export type ProgramEnrolmentListParams = {
  sortBy?: SortRule<ProgramEnrolmentSortFieldInput>;
  filterBy?: FilterBy;
};

export type EncounterListParams = {
  first?: number;
  offset?: number;
  sortBy: SortRule<EncounterSortFieldInput>;
  filterBy?: FilterByWithBoolean | null;
  pagination?: PaginationInput;
};

export type CentralPatientSearchResponse =
  CentralPatientSearchQuery['centralPatientSearch'];

export type LinkPatientToStoreResponse =
  LinkPatientToStoreMutation['linkPatientToStore'];

export const getPatientQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    byId: async (nameId: string) => {
      const result = await sdk.patientById({ storeId, nameId });
      const { patients } = result;
      if (patients.__typename === 'PatientConnector') {
        return patients.nodes[0];
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
        page:
          first || offset
            ? {
                first,
                offset,
              }
            : undefined,
        sort: key
          ? {
              key,
              desc: key && !!sortBy?.isDesc,
            }
          : undefined,
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
        sort: { key, desc: !!sortBy?.isDesc },
        storeId,
      });

      return result?.patients;
    },
    search: async (
      input: PatientSearchInput
    ): Promise<{
      totalCount: number;
      nodes: { score: number; patient: ProgramPatientRowFragment }[];
    }> => {
      const result = await sdk.patientSearch({
        storeId,
        input,
      });

      if (result.patientSearch.__typename === 'PatientSearchConnector') {
        return result.patientSearch;
      }

      throw new Error('Could not search for patients');
    },
    centralSearch: async (
      input: CentralPatientSearchInput
    ): Promise<CentralPatientSearchResponse> => {
      const result = await sdk.centralPatientSearch({
        storeId,
        input,
      });
      return result.centralPatientSearch;
    },
  },
  insertPatient: async (
    input: InsertPatientInput
  ): Promise<ProgramPatientRowFragment> => {
    const result = await sdk.insertPatient({
      storeId,
      input,
    });

    if (result.insertPatient?.__typename === 'PatientNode') {
      return result.insertPatient;
    }

    throw new Error('Could not insert patient');
  },

  updatePatient: async (
    input: UpdatePatientInput
  ): Promise<ProgramPatientRowFragment> => {
    const result = await sdk.updatePatient({
      storeId,
      input,
    });

    if (result.updatePatient.__typename === 'PatientNode') {
      return result.updatePatient;
    }

    throw new Error('Could not update patient');
  },

  insertProgramPatient: async (
    input: InsertProgramPatientInput
  ): Promise<ProgramPatientRowFragment> => {
    const result = await sdk.insertProgramPatient({
      storeId,
      input,
    });

    if (result.insertProgramPatient?.__typename === 'PatientNode') {
      return result.insertProgramPatient;
    }

    throw new Error('Could not insert program patient');
  },

  updateProgramPatient: async (
    input: UpdateProgramPatientInput
  ): Promise<ProgramPatientRowFragment> => {
    const result = await sdk.updateProgramPatient({
      storeId,
      input,
    });

    if (result.updateProgramPatient.__typename === 'PatientNode') {
      return result.updateProgramPatient;
    }

    throw new Error('Could not update program patient');
  },
  linkPatientToStore: async (
    nameId: string
  ): Promise<LinkPatientToStoreResponse> => {
    const result = await sdk.linkPatientToStore({
      storeId,
      nameId,
    });
    return result.linkPatientToStore;
  },

  latestPatientEncounter: async (
    patientId: string,
    encounterType: string | undefined
  ): Promise<LatestPatientEncounterQuery['encounters']> =>
    (await sdk.latestPatientEncounter({ storeId, patientId, encounterType }))
      .encounters,
});
