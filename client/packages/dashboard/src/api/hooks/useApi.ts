import { useAuthContext, useGql } from '@openmsupply-client/common';
import { getSdk } from '../operations.generated';

export const useApi = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const api = getSdk(client);

  return { api, storeId };
};
