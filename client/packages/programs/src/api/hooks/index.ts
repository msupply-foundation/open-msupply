import {
  EncounterFragment,
  EncounterRowFragment,
} from '../operations.generated';
import { Document } from './document';
import { ProgramEnrolmentRowFragmentWithId } from './document/useProgramEnrolments';
import { EncounterRegistryByProgram } from './document/useEncounterRegistriesByPrograms';
import { useDocumentRegistryApi } from './utils/useDocumentRegistryApi';
import { useEncounterIdFromUrl } from './utils/useEncounterIdFromUrl';

export { EncounterRegistryByProgram };

export {
  ProgramEnrolmentRowFragmentWithId,
  useDocumentRegistryApi,
  EncounterFragment,
  EncounterRowFragment,
};

export const useDocument = {
  utils: {
    allocateNumber: Document.useAllocateNumber,
  },
  get: {
    documentByName: Document.useDocumentByName,
    history: Document.useDocumentHistory,
  },
};

export const useDocumentRegistry = {
  get: {
    documentRegistry: Document.useDocumentRegistryByContext,
    programRegistries: Document.useProgramRegistries,
    encounterRegistriesByPrograms: Document.useEncounterRegistriesByPrograms,
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
    list: Document.useEncounters,
    byId: Document.useEncounterById,
    byIdPromise: Document.useEncounterByIdPromise,
    previous: Document.useEncounterPrevious,
    upsert: Document.useUpsertEncounter,
  },
};

export const useProgramEnrolments = {
  document: {
    programEnrolments: Document.useProgramEnrolments,
    programEnrolmentsPromise: Document.useProgramEnrolmentsPromise,
    insert: Document.useInsertProgramEnrolment,
    update: Document.useUpdateProgramEnrolment,
  },
};

export const useClinicians = {
  document: {
    list: Document.useClinicians,
  },
};

export const useFormSchema = {
  document: {
    byType: Document.useFormSchemaByType,
  },
};
