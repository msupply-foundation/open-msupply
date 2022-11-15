import { useGql, useAuthContext, SortBy } from '@openmsupply-client/common';
import {
  EncounterListParams,
  getPatientQueries,
  ListParams,
  ProgramEnrolmentListParams,
} from '../../api';
import { getSdk, PatientRowFragment } from '../../operations.generated';

export const usePatientApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['patient'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    history: (id: string) => [...keys.base(), 'history', storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<PatientRowFragment>) =>
      [...keys.list(), sortBy] as const,
    enrolmentParamList: (params: ProgramEnrolmentListParams) =>
      ['program-enrolment', storeId, 'list', params] as const,
    programEncountersParamList: (programs: string[]) =>
      ['program-encounters', storeId, 'list', ...programs] as const,
    listEncounter: () => ['encounter', storeId, 'list'] as const,
    paramListEncounter: (params: EncounterListParams) =>
      [...keys.listEncounter(), params] as const,
  };
  const { client } = useGql();
  const queries = getPatientQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
