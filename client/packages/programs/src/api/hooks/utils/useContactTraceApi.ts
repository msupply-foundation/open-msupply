import { useGql, useAuthContext } from '@openmsupply-client/common';
import { ContactTraceListParams, getContactTraceQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useContactTraceApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['contact-trace'] as const,
    list: (params: ContactTraceListParams) =>
      [...keys.base(), storeId, 'list', params] as const,
  };
  const { client } = useGql();
  const queries = getContactTraceQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
