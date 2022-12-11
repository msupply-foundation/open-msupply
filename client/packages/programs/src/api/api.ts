import { DocumentRegistryNodeContext } from '@common/types';
import {
  DocumentFragment,
  DocumentRegistryFragment,
  EncounterFieldsFragment,
  EncounterFragment,
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
  },
});

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
