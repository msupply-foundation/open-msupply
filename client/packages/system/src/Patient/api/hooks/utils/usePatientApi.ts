import {
  useGql,
  useAuthContext,
  SortBy,
  CentralPatientSearchInput,
  PatientSearchInput,
} from '@openmsupply-client/common';
import { getPatientQueries, ListParams } from '../../api';
import { getSdk, PatientRowFragment } from '../../operations.generated';

// Defined here (not imported from the api barrel) to avoid a circular import:
// the barrel re-exports `./hooks`, which reads `usePatientApi` at eval time, so
// importing from it here would create a temporal-dead-zone init error.
export const PATIENT_PROPERTIES_V2_KEY = 'patient-properties-v2';

export const usePatientApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['patient'] as const,
    detail: (id: string) => [...keys.base(), id] as const,
    propertiesV2: () => [PATIENT_PROPERTIES_V2_KEY] as const,
    history: (id: string) => [...keys.base(), 'history', id] as const,
    list: () => [...keys.base(), 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<PatientRowFragment>) =>
      [...keys.list(), sortBy] as const,
    search: (params: PatientSearchInput) =>
      [...keys.list(), 'search', params] as const,
    centralSearch: (params: CentralPatientSearchInput) =>
      [...keys.base(), 'centralSearch', params] as const,
    latestPatientEncounter: (
      patientId: string,
      encounterType: string | undefined
    ) =>
      [
        ...keys.base(),
        'latestPatientEncounter',
        patientId,
        encounterType,
      ] as const,
  };
  const { client } = useGql();
  const queries = getPatientQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
