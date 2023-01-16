import { useDocumentByName } from './useDocumentByName';
import { usePatientDocument } from './usePatientDocument';
import { useDocumentRegistryByContext } from './useDocumentRegistryByContext';
import { useProgramRegistries } from './useProgramRegistries';
import { useAllocateNumber } from './useAllocateNumber';
import { useEncounterFields } from './useEncounterFields';
import { useEncounterById } from './useEncounterById';
import { useEncounterPrevious } from './useEncounterPrevious';
import {
  useProgramEnrolments,
  useProgramEnrolmentsPromise,
} from './useProgramEnrolments';

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
};
