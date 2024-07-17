import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

// TODO: generic useGraphql with all except stock API
export const useReportGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId } = useAuthContext();
  const reportApi = getSdk(client);

  return { reportApi, queryClient, storeId };
};
