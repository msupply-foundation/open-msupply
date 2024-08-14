import {
  EncounterFragment,
  EncounterRowFragment,
} from '../operations.generated';
import { Document } from './document';
import { ProgramEnrolmentRowFragmentWithId } from './document/useProgramEnrolments';
import { EncounterRegistryByProgram } from './document/useEncounterRegistriesByPrograms';
import { useDocumentRegistryApi } from './utils/useDocumentRegistryApi';
import { useIdFromUrl } from './utils/useIdFromUrl';

export { EncounterRegistryByProgram };

export * from './types';
export * from './useDeleteSelectedImmunisationPrograms';
export * from './useDeleteSelectedVaccineCourses';
export * from './useImmunisationProgram';
export * from './useImmunisationProgramList';
export * from './useVaccineCourse';
export * from './useVaccineCourseList';
export * from './useProgramList';

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
    documentRegistries: Document.useDocumentRegistries,
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
    idFromUrl: useIdFromUrl,
  },
  encounterFields: Document.useEncounterFields,
  document: {
    list: Document.useEncounters,
    byId: Document.useEncounterById,
    byIdPromise: Document.useEncounterByIdPromise,
    byDocName: Document.useEncounterByDocName,
    previous: Document.useEncounterPrevious,
    upsert: Document.useUpsertEncounter,
    upsertDocument: Document.useUpsertEncounterDocument,
  },
};

export const useProgramEnrolments = {
  document: {
    list: Document.useProgramEnrolments,
    programEnrolmentsPromise: Document.useProgramEnrolmentsPromise,
    byDocName: Document.useProgramEnrolmentByDocName,
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

export const useProgramEvents = {
  document: {
    list: Document.useProgramEvents,
  },
};

export const useContactTraces = {
  document: {
    list: Document.useContactTraces,
    insert: Document.useInsertContactTrace,
    update: Document.useUpdateContactTrace,
    upsert: Document.useUpsertContactTrace,
    upsertDocument: Document.useUpsertContactTraceDocument,
  },
  utils: {
    idFromUrl: useIdFromUrl,
  },
};
