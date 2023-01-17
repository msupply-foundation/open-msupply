import { useDocumentByName } from './useDocumentByName';
import { useDocumentRegistryByContext } from './useDocumentRegistryByContext';

import { useProgramRegistries } from './useProgramRegistries';

import { usePatientDocument } from './usePatientDocument';
import { useAllocateNumber } from './useAllocateNumber';

import { useEncounterFields } from './useEncounterFields';
import { useEncounterById } from './useEncounterById';
import { useEncounterPrevious } from './useEncounterPrevious';

import {
  useProgramEnrolments,
  useProgramEnrolmentsPromise,
} from './useProgramEnrolments';
import { useInsertProgramEnrolment } from './useInsertProgramEnrolment';
import { useUpdateProgramEnrolment } from './useUpdateProgramEnrolment';

export const Document = {
  useDocumentByName,
  usePatientDocument,
  useDocumentRegistryByContext,
  useProgramRegistries,
  useAllocateNumber,
  useEncounterById,
  useEncounterFields,
  useEncounterPrevious,
  useProgramEnrolments,
  useProgramEnrolmentsPromise,
  useInsertProgramEnrolment,
  useUpdateProgramEnrolment,
};
