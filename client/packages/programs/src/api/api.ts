import { FilterBy, SortBy, SortRule } from '@common/hooks';
import {
  ClinicianSortFieldInput,
  DocumentRegistryFilterInput,
  DocumentRegistryNode,
  DocumentRegistryNodeContext,
  DocumentRegistrySortFieldInput,
  EncounterSortFieldInput,
  InsertEncounterInput,
  InsertProgramEnrolmentInput,
  ProgramEnrolmentSortFieldInput,
  UpdateEncounterInput,
  UpdateProgramEnrolmentInput,
} from '@common/types';
import { EncounterListParams } from './hooks/utils/useEncounterApi';
import {
  ClinicianFragment,
  DocumentFragment,
  DocumentRegistryFragment,
  DocumentRegistryWithChildrenFragment,
  EncounterFieldsFragment,
  EncounterFragment,
  EncounterRowFragment,
  FormSchemaFragment,
  ProgramEnrolmentRowFragment,
  Sdk,
} from './operations.generated';

export const getDocumentQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    byDocName: async (name: string): Promise<DocumentFragment> => {
      const result = await sdk.documentByName({ name, storeId });
      const document = result?.document;

      if (document?.__typename === 'DocumentNode') {
        return document;
      }
      throw new Error('Error querying document');
    },
    byPatient: async (patientId: string): Promise<DocumentFragment> => {
      const result = await sdk.documents({
        storeId,
        filter: {
          owner: { equalTo: patientId },
          type: { equalTo: 'Patient' },
        },
      });
      const documents = result?.documents;
      if (documents?.__typename !== 'DocumentConnector') {
        throw new Error('Error querying document');
      }

      const patientDoc = documents.nodes[0];
      if (patientDoc) {
        return patientDoc;
      }
      throw new Error('Patient document does not exist');
    },
    documentHistory: async (
      documentName: string
    ): Promise<DocumentFragment[]> => {
      const result = await sdk.getDocumentHistory({
        storeId,
        name: documentName,
      });
      return result.documentHistory.nodes;
    },
  },
});

export type DocumentRegistryParams = {
  filter?: DocumentRegistryFilterInput;
  sortBy?: SortBy<DocumentRegistryNode>;
};

export const getEncounterQueries = (sdk: Sdk, storeId: string) => ({
  list: async ({
    sortBy,
    filterBy,
    pagination,
  }: EncounterListParams): Promise<{
    nodes: EncounterRowFragment[];
    totalCount: number;
  }> => {
    const result = await sdk.encounters({
      storeId,
      key: sortBy?.key as EncounterSortFieldInput | undefined,
      desc: sortBy?.isDesc,
      filter: filterBy,
      page: pagination,
      eventTime: new Date().toISOString(),
    });

    return result?.encounters;
  },
  encounterFields: async (
    patientId: string,
    fields: string[]
  ): Promise<EncounterFieldsFragment[]> => {
    const result = await sdk.encounterFields({ patientId, fields, storeId });
    const data = result?.encounterFields;

    if (data?.__typename === 'EncounterFieldsConnector') {
      return data.nodes;
    }
    throw new Error('Error querying document');
  },
  byId: async (encounterId: string): Promise<EncounterFragment> => {
    const result = await sdk.encounterById({ encounterId, storeId });
    const encounters = result?.encounters;

    if (
      encounters?.__typename === 'EncounterConnector' &&
      !!encounters.nodes[0]
    ) {
      return encounters.nodes[0];
    } else {
      throw new Error('Could not find encounter');
    }
  },
  previousEncounters: async (
    patientId: string,
    current: Date
  ): Promise<EncounterFragment> => {
    const result = await sdk.encountersWithDocument({
      storeId,
      key: EncounterSortFieldInput.StartDatetime,
      desc: true,
      filter: {
        startDatetime: {
          beforeOrEqualTo: new Date(current.getTime() - 1).toISOString(),
        },
        patientId: {
          equalTo: patientId,
        },
      },
      page: { first: 1 },
    });
    const encounters = result?.encounters;

    if (
      encounters?.__typename === 'EncounterConnector' &&
      !!encounters.nodes[0]
    ) {
      return encounters.nodes[0];
    } else {
      throw new Error('Could not find encounter');
    }
  },

  insertEncounter: async (
    input: InsertEncounterInput
  ): Promise<EncounterFragment> => {
    const result = await sdk.insertEncounter({
      storeId,
      input,
    });

    if (result.insertEncounter.__typename === 'EncounterNode') {
      return result.insertEncounter;
    }

    throw new Error('Could not insert encounter');
  },

  updateEncounter: async (
    input: UpdateEncounterInput
  ): Promise<EncounterFragment> => {
    const result = await sdk.updateEncounter({
      storeId,
      input,
    });

    if (result.updateEncounter.__typename === 'EncounterNode') {
      return result.updateEncounter;
    }

    throw new Error('Could not update encounter');
  },
});

export const getDocumentRegistryQueries = (sdk: Sdk) => ({
  get: {
    byDocType: async (type: string): Promise<DocumentRegistryFragment[]> => {
      const result = await sdk.documentRegistries({
        filter: { documentType: { equalTo: type } },
      });
      const entries = result?.documentRegistries;

      if (entries?.__typename === 'DocumentRegistryConnector') {
        return entries.nodes;
      }
      throw new Error('Error querying document registry by type');
    },
    byDocContext: async (
      context: DocumentRegistryNodeContext
    ): Promise<DocumentRegistryFragment[]> => {
      const result = await sdk.documentRegistries({
        filter: { context: { equalTo: context } },
      });
      const entries = result?.documentRegistries;

      if (entries?.__typename === 'DocumentRegistryConnector') {
        return entries.nodes;
      }
      throw new Error('Error querying document registry by context');
    },
    documentRegistries: async ({
      sortBy,
      filter,
    }: DocumentRegistryParams): Promise<{
      nodes: DocumentRegistryFragment[];
      totalCount: number;
    }> => {
      const result = await sdk.documentRegistries({
        filter,
        sort: {
          key:
            (sortBy?.key as DocumentRegistrySortFieldInput) ??
            DocumentRegistrySortFieldInput.DocumentType,
          desc: sortBy?.isDesc ?? false,
        },
      });

      return result?.documentRegistries;
    },
    programRegistries: async (
      sortBy?: SortBy<DocumentRegistryNode>
    ): Promise<{
      nodes: DocumentRegistryWithChildrenFragment[];
      totalCount: number;
    }> => {
      const result = await sdk.documentRegistriesWithChildren({
        filter: {
          context: {
            equalTo: DocumentRegistryNodeContext.Program,
          },
        },
        sort: {
          key:
            (sortBy?.key as DocumentRegistrySortFieldInput) ??
            DocumentRegistrySortFieldInput.DocumentType,
          desc: sortBy?.isDesc ?? false,
        },
      });

      return result?.documentRegistries;
    },
  },
});

export const getAllocateProgramNumber = (sdk: Sdk, storeId: string) => ({
  allocateProgramNumber: async (numberName: string): Promise<number> => {
    const result = await sdk.allocateProgramNumber({
      storeId,
      numberName,
    });
    const numberNode = result?.allocateProgramNumber;

    if (numberNode?.__typename === 'NumberNode') {
      return numberNode.number;
    }
    throw new Error('Error allocating a new number');
  },
});

export type ProgramEnrolmentListParams = {
  sortBy?: SortRule<ProgramEnrolmentSortFieldInput>;
  filterBy?: FilterBy;
};

export const getProgramEnrolmentQueries = (sdk: Sdk, storeId: string) => ({
  programEnrolments: async ({
    sortBy,
    filterBy,
  }: ProgramEnrolmentListParams): Promise<{
    nodes: ProgramEnrolmentRowFragment[];
    totalCount: number;
  }> => {
    const result = await sdk.programEnrolments({
      storeId,
      key:
        (sortBy?.key as ProgramEnrolmentSortFieldInput) ??
        ProgramEnrolmentSortFieldInput.EnrolmentDatetime,
      desc: sortBy?.isDesc,
      filter: filterBy,
      eventTime: new Date().toISOString(),
    });

    return result?.programEnrolments;
  },

  insertProgramEnrolment: async (
    input: InsertProgramEnrolmentInput
  ): Promise<DocumentFragment> => {
    const result = await sdk.insertProgramEnrolment({
      storeId,
      input,
    });

    if (result.insertProgramEnrolment.__typename === 'ProgramEnrolmentNode') {
      return result.insertProgramEnrolment.document;
    }

    throw new Error('Could not insert program');
  },

  updateProgramEnrolment: async (
    input: UpdateProgramEnrolmentInput
  ): Promise<DocumentFragment> => {
    const result = await sdk.updateProgramEnrolment({
      storeId,
      input,
    });

    if (result.updateProgramEnrolment.__typename === 'ProgramEnrolmentNode') {
      return result.updateProgramEnrolment.document;
    }

    throw new Error('Could not update program');
  },
});

export type ClinicianListParams = {
  sortBy?: SortRule<ProgramEnrolmentSortFieldInput>;
  filterBy?: FilterBy;
};

export const getClinicianQueries = (sdk: Sdk, storeId: string) => ({
  clinicians: async ({
    sortBy,
    filterBy,
  }: ClinicianListParams): Promise<{
    nodes: ClinicianFragment[];
    totalCount: number;
  }> => {
    const result = await sdk.clinicians({
      storeId,
      key:
        (sortBy?.key as ClinicianSortFieldInput) ??
        ClinicianSortFieldInput.LastName,
      desc: sortBy?.isDesc,
      filter: filterBy,
    });

    if (result.clinicians.__typename === 'ClinicianConnector') {
      return result.clinicians;
    }
    throw new Error('Error querying clinicians');
  },
});

export const getFormSchemaQueries = (sdk: Sdk) => ({
  get: {
    byType: async (type: string): Promise<FormSchemaFragment> => {
      const result = await sdk.formSchema({
        filter: { type: { equalTo: type } },
      });

      if (result.formSchema?.__typename === 'FormSchemaNode') {
        return result.formSchema;
      }

      throw new Error('Error querying form schema');
    },
  },
});
