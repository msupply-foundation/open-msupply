import { usePatientDocumentApi } from './useDocumentApi';
import { useDocumentRegistryApi } from './useDocumentRegistryApi';
import { useEncounterApi } from './useEncounterApi';
import { useEncounterIdFromUrl } from './useEncounterIdFromUrl';

export const Utils = {
  useDocumentApi: usePatientDocumentApi,
  useDocumentRegistryApi,
  useEncounterApi,
  useEncounterIdFromUrl,
};
