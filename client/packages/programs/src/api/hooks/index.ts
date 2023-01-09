import { Document } from './document';
import { useEncounterIdFromUrl } from './utils/useEncounterIdFromUrl';

export const useDocument = {
  utils: {
    allocateNumber: Document.useAllocateNumber,
  },
  get: {
    documentByName: Document.useDocumentByName,
  },
};

export const useDocumentRegistry = {
  get: {
    documentRegistry: Document.useDocumentRegistryByContext,
    programRegistries: Document.useProgramRegistries,
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
