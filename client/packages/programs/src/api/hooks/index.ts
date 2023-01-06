import { Document } from './document';
import { useEncounterIdFromUrl } from './utils/useEncounterIdFromUrl';

export const useDocument = {
  utils: {
    allocateNumber: Document.useAllocateNumber,
  },
  get: {
    documentByName: Document.useDocumentByName,

    documentRegistry: Document.useDocumentRegistryByContext,
  },
};

export const usePatient = {
  get: {
    patientDocument: Document.usePatientDocument,
  },
};

export const useEncounter = {
  utils: {
    idFromUrl: useEncounterIdFromUrl,
  },
  encounterFields: Document.useEncounterFields,
  document: {
    byId: Document.useEncounterById,
    previous: Document.useEncounterPrevious,
  },
};
