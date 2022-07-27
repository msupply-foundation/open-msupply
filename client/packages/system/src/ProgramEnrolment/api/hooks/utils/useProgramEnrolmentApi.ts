import { useGql, useAuthContext } from '@openmsupply-client/common';
import { getProgramEnrolmentQueries, ListParams } from '../../api';
import { getSdk } from '../../operations.generated';

export const usePatientEnrolmentApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['patient'] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };
  const { client } = useGql();
  const queries = getProgramEnrolmentQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
