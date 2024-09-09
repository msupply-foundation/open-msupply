import { FilterBy, SortBy, SortRule } from '@common/hooks';
import {
  ClinicianSortFieldInput,
  DocumentRegistryFilterInput,
  DocumentRegistryNode,
  DocumentRegistrySortFieldInput,
  DocumentRegistryCategoryNode,
  EncounterSortFieldInput,
  InsertEncounterInput,
  InsertProgramEnrolmentInput,
  PaginationInput,
  ProgramEnrolmentSortFieldInput,
  ProgramEventFilterInput,
  UpdateEncounterInput,
  UpdateProgramEnrolmentInput,
  ProgramEnrolmentFilterInput,
  ContactTraceFilterInput,
  ContactTraceSortFieldInput,
  UpdateContactTraceInput,
  InsertContactTraceInput,
} from '@common/types';
import { EncounterListParams } from './hooks/utils/useEncounterApi';
import {
  ClinicianFragment,
  ContactTraceFragment,
  ContactTraceRowFragment,
  DocumentFragment,
  DocumentRegistryFragment,
  EncounterByIdQuery,
  EncounterFieldsFragment,
  EncounterFragment,
  EncounterRowFragment,
  FormSchemaFragment,
  ProgramEnrolmentFragment,
  ProgramEnrolmentRowFragment,
  ProgramEventFragment,
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
      key: sortBy?.key as EncounterSortFieldInput,
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
  byId: async (
    encounterId: string
  ): Promise<EncounterByIdQuery['encounters']['nodes'][number]> => {
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
  byDocName: async (
    documentName: string
  ): Promise<EncounterFragment | undefined> => {
    const result = await sdk.encounterByDocName({ documentName, storeId });
    const encounters = result?.encounters;

    if (encounters?.__typename === 'EncounterConnector') {
      return encounters.nodes[0];
    }
    return undefined;
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

    if (result?.insertEncounter.__typename === 'EncounterNode') {
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

    if (result?.updateEncounter.__typename === 'EncounterNode') {
      return result.updateEncounter;
    }

    throw new Error('Could not update encounter');
  },
});

export const getDocumentRegistryQueries = (sdk: Sdk, storeId: string) => ({
  get: {
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
        storeId,
      });

      return result?.documentRegistries;
    },
    programRegistries: async (
      sortBy?: SortBy<DocumentRegistryNode>
    ): Promise<{
      nodes: DocumentRegistryFragment[];
      totalCount: number;
    }> => {
      const result = await sdk.documentRegistries({
        filter: {
          category: {
            equalTo: DocumentRegistryCategoryNode.ProgramEnrolment,
          },
        },
        sort: {
          key:
            (sortBy?.key as DocumentRegistrySortFieldInput) ??
            DocumentRegistrySortFieldInput.DocumentType,
          desc: sortBy?.isDesc ?? false,
        },
        storeId,
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
  filterBy?: ProgramEnrolmentFilterInput;
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

  byDocName: async (
    documentName: string
  ): Promise<ProgramEnrolmentFragment | undefined> => {
    const result = await sdk.programEnrolmentByDocName({
      storeId,
      documentName,
    });
    const programEnrolment = result?.programEnrolments;

    if (programEnrolment?.__typename === 'ProgramEnrolmentConnector') {
      return programEnrolment.nodes[0];
    }
    return undefined;
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
    byType: async (type: string): Promise<FormSchemaFragment | undefined> => {
      const result = await sdk.formSchemas({
        filter: { type: { equalTo: type } },
      });

      if (result.formSchemas?.__typename === 'FormSchemaConnector') {
        return result.formSchemas.nodes[0];
      }

      throw new Error('Error querying form schema');
    },
  },
});

export type ProgramEventParams = {
  at?: Date;
  filter?: ProgramEventFilterInput;
  page?: PaginationInput;
};

export const getProgramEventQueries = (sdk: Sdk, storeId: string) => ({
  activeProgramEvents: async ({
    at,
    filter,
    page,
  }: ProgramEventParams): Promise<{
    nodes: ProgramEventFragment[];
    totalCount: number;
  }> => {
    const result = await sdk.activeProgramEvents({
      storeId,
      at: at?.toISOString(),
      filter,
      page,
    });

    if (result.activeProgramEvents.__typename === 'ProgramEventConnector') {
      return result.activeProgramEvents;
    }
    throw new Error('Error querying program events');
  },
});

export type ContactTraceListParams = {
  sortBy?: SortRule<ContactTraceSortFieldInput>;
  filterBy?: ContactTraceFilterInput;
};

export const getContactTraceQueries = (sdk: Sdk, storeId: string) => ({
  list: async ({
    sortBy,
    filterBy,
  }: ContactTraceListParams): Promise<{
    nodes: ContactTraceRowFragment[];
    totalCount: number;
  }> => {
    const result = await sdk.contactTraces({
      storeId,
      key:
        (sortBy?.key as ContactTraceSortFieldInput) ??
        ContactTraceSortFieldInput.Datetime,
      desc: sortBy?.isDesc,
      filter: filterBy,
    });

    return result?.contactTraces;
  },

  insert: async (
    input: InsertContactTraceInput
  ): Promise<ContactTraceFragment> => {
    const result = await sdk.insertContactTrace({
      storeId,
      input,
    });

    if (result.insertContactTrace.__typename === 'ContactTraceNode') {
      return result.insertContactTrace;
    }

    throw new Error('Could not insert contact trace');
  },

  update: async (
    input: UpdateContactTraceInput
  ): Promise<ContactTraceFragment> => {
    const result = await sdk.updateContactTrace({
      storeId,
      input,
    });

    if (result.updateContactTrace.__typename === 'ContactTraceNode') {
      return result.updateContactTrace;
    }

    throw new Error('Could not update contact trace');
  },
});
