import { useGql } from '@openmsupply-client/common';
import { getProgramQueries, ListParams } from '../../api';
import { getSdk } from '../../operations.generated';

export const useProgramApi = () => {
  const keys = {
    base: () => ['program'] as const,
    list: () => [...keys.base(), 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };
  const { client } = useGql();
  const queries = getProgramQueries(getSdk(client));

  return { ...queries, keys };
};
