import { DocumentRegistryNodeContext } from '@common/types';
import {
  DocumentFragment,
  DocumentRegistryFragment,
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

export const getAllocateNumberMutations = (sdk: Sdk, storeId: string) => ({
  allocateNumber: async (numberName: string): Promise<number> => {
    const result = await sdk.allocateNumber({
      storeId,
      numberName,
    });
    const numberNode = result?.allocateNumber;

    if (numberNode?.__typename === 'NumberNode') {
      return numberNode.number;
    }
    throw new Error('Error allocation a new number');
  },
});
