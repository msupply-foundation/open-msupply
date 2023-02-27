import { useClinicianApi } from './useClinicianApi';
import { usePatientDocumentApi } from './useDocumentApi';
import { useDocumentRegistryApi } from './useDocumentRegistryApi';
import { useEncounterApi } from './useEncounterApi';
import { useEncounterIdFromUrl } from './useEncounterIdFromUrl';
import { useProgramEnrolmentApi } from './useProgramEnrolmentApi';
import { useProgramEventApi } from './useProgramEventApi';

export const Utils = {
  useDocumentApi: usePatientDocumentApi,
  useDocumentRegistryApi,
  useEncounterApi,
  useEncounterIdFromUrl,
  useProgramEnrolmentApi,
  useClinicianApi,
  useProgramEventApi,
};
