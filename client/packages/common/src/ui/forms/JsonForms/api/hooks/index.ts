import { Document } from './document';

export const useDocument = {
  get: {
    document: Document.useDocument,
    documentRegistry: Document.useDocumentRegistryByContext,
  },
};
