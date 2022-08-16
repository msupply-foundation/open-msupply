import { Document } from './document';

export const useDocument = {
  utils: {
    allocateNumber: Document.useAllocateNumber,
  },
  get: {
    document: Document.useDocument,
    documentRegistry: Document.useDocumentRegistryByContext,
  },
  encounterExtractFields: Document.useEncounterExtractFields,
};
