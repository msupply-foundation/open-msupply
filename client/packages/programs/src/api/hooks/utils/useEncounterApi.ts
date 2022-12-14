import {
  useGql,
  useAuthContext,
  FilterBy,
  PaginationInput,
  SortBy,
} from '@openmsupply-client/common';
import { getEncounterQueries } from '../../api';
import { EncounterBaseFragment, getSdk } from '../../operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<EncounterBaseFragment>;
  filterBy?: FilterBy | null;
  pagination?: PaginationInput;
};

export const useEncounterApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['encounter'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) =>
      [...keys.base(), storeId, ...keys.list(), params] as const,
    encounterFields: (patientId: string, fields: string[]) =>
      [...keys.base(), storeId, patientId, 'fields', ...fields] as const,
    previous: (patientId: string, current: number) => [
      ...keys.base(),
      storeId,
      patientId,
      'previous',
      current,
    ],
  };
  const { client } = useGql();
  const queries = getEncounterQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
