import {
  useGql,
  useAuthContext,
  PaginationInput,
  SortBy,
  EncounterFilterInput,
} from '@openmsupply-client/common';
import { getEncounterQueries } from '../../api';
import { EncounterFragment, getSdk } from '../../operations.generated';

export type EncounterListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<EncounterFragment>;
  filterBy?: EncounterFilterInput;
  pagination?: PaginationInput;
};

export const useEncounterApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['encounter'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    byDocName: (documentName: string) => [
      ...keys.base(),
      storeId,
      documentName,
    ],
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: EncounterListParams) =>
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
