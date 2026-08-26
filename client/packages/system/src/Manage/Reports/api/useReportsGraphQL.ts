import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useAllReportVersionsGraphQL = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queryClient = useQueryClient();
  const reportApi = getSdk(client);

  return { reportApi, queryClient, storeId };
};
