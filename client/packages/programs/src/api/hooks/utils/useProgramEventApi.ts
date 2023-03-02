import { useGql, useAuthContext } from '@openmsupply-client/common';
import { getProgramEventQueries, ProgramEventParams } from '../../api';
import { getSdk } from '../../operations.generated';

export const useProgramEventApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['programEvents'] as const,
    list: (params: ProgramEventParams) =>
      [...keys.base(), storeId, 'list', params] as const,
  };
  const { client } = useGql();
  const queries = getProgramEventQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
