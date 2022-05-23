import { useGql, useAuthContext, SortBy } from '@openmsupply-client/common';
import { getPatientQueries, ListParams } from '../../api';
import { getSdk, PatientRowFragment } from '../../operations.generated';

export const usePatientApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['name'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<PatientRowFragment>) =>
      [...keys.list(), sortBy] as const,
  };
  const { client } = useGql();
  const queries = getPatientQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
