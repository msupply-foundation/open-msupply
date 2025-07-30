import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useCampaignGraphQL = () => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queryClient = useQueryClient();
  const campaignApi = getSdk(client);

  return { campaignApi, queryClient, storeId };
};
