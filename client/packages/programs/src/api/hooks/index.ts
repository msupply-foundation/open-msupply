import { Document } from './document';
import { useEncounterIdFromUrl } from './utils/useEncounterIdFromUrl';

export const useDocument = {
  utils: {
    allocateNumber: Document.useAllocateNumber,
  },
  get: {
    document: Document.useDocument,
    documentRegistry: Document.useDocumentRegistryByContext,
  },
};

export const useEncounter = {
  utils: {
    idFromUrl: useEncounterIdFromUrl,
  },
  encounterFields: Document.useEncounterFields,
  document: {
    byId: Document.useEncounterById,
  },
};
