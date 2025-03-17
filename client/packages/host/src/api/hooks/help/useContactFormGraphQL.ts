import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';

export const useContactFormGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId, store } = useAuthContext();
  const api = getSdk(client);

  return { api, queryClient, storeId, store };
};
