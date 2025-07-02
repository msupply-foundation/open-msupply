import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useContactGraphQL = () => {
  const { client } = useGql(); // generates client connection
  const queryClient = useQueryClient(); //
  const { storeId } = useAuthContext(); // manages auth, grabs store id
  const contactApi = getSdk(client); // auto generates the code to call our graphql layer in the server (what happens when you run yarn generate)

  return { contactApi, queryClient, storeId };
};
