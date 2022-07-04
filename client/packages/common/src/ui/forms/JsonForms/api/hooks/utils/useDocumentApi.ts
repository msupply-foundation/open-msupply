import { useGql, useAuthContext } from '@openmsupply-client/common';
import { getDocumentQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useDocumentApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    detail: (name: string) => [storeId, name] as const,
  };
  const { client } = useGql();
  const queries = getDocumentQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
