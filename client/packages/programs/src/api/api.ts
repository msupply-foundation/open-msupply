import {
  DocumentRegistryFilterInput,
  DocumentRegistryNodeContext,
  DocumentRegistrySortFieldInput,
  EncounterSortFieldInput,
} from '@common/types';
import {
  DocumentFragment,
  DocumentRegistryFragment,
  EncounterBaseFragment,
  EncounterFieldsFragment,
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
  },
});

export type DocumentRegistryParams = {
  filter?: DocumentRegistryFilterInput;
};

export const getEncounterQueries = (sdk: Sdk, storeId: string) => ({
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
  byId: async (encounterId: string): Promise<EncounterBaseFragment> => {
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
  ): Promise<EncounterBaseFragment> => {
    const result = await sdk.encounters({
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
      filter,
    }: DocumentRegistryParams): Promise<{
      nodes: DocumentRegistryFragment[];
      totalCount: number;
    }> => {
      const result = await sdk.documentRegistries({
        filter,
        sort: {
          key: DocumentRegistrySortFieldInput.DocumentType,
          desc: false,
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
