import {
  useGql,
  useAuthContext,
  SortBy,
  CentralPatientSearchInput,
  PatientSearchInput,
} from '@openmsupply-client/common';
import { getPatientQueries, ListParams } from '../../api';
import { getSdk, PatientRowFragment } from '../../operations.generated';

export const usePatientApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['patient'] as const,
    detail: (id: string) => [...keys.base(), id] as const,
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
