import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from '../operations.generated';

export const useRequestRequisitionGraphql = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId } = useAuthContext();
  const api = getSdk(client);

  return { api, queryClient, storeId };
};
