import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useShippingMethodGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId } = useAuthContext();
  const shippingMethodApi = getSdk(client);

  return { shippingMethodApi, queryClient, storeId };
};
