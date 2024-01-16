import { useClinicianApi } from './useClinicianApi';
import { usePatientDocumentApi } from './useDocumentApi';
import { useDocumentRegistryApi } from './useDocumentRegistryApi';
import { useEncounterApi } from './useEncounterApi';
import { useIdFromUrl } from './useIdFromUrl';
import { useProgramEnrolmentApi } from './useProgramEnrolmentApi';
import { useProgramEventApi } from './useProgramEventApi';
import { useContactTraceApi } from './useContactTraceApi';

export const Utils = {
  useDocumentApi: usePatientDocumentApi,
  useDocumentRegistryApi,
  useEncounterApi,
  useIdFromUrl,
  useProgramEnrolmentApi,
  useClinicianApi,
  useProgramEventApi,
  useContactTraceApi,
};
