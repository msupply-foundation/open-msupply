import { CampaignRowFragment } from '../operations.generated';
import { useCampaignGraphQL } from '../useCampaignGraphQL';
import { CAMPAIGN } from './keys';
import {
  SortBy,
  useQuery,
  useMutation,
  LIST_KEY,
  CampaignFilterInput,
  CampaignSortFieldInput,
  UpsertCampaignInput,
} from '@openmsupply-client/common';

type ListParams = {
  sortBy: SortBy<CampaignRowFragment>;
  first?: number;
  offset?: number;
  filterBy?: CampaignFilterInput | null;
};

export const useCampaigns = (queryParams?: ListParams) => {
  // QUERY
  const { data, isLoading, isError } = useGetList(queryParams);

  // UPSERT
  const {
    mutateAsync: upsert,
    isLoading: isUpserting,
    error: upsertError,
  } = useUpsertCampaign();

  // DELETE
  const {
    mutateAsync: deleteCampaign,
    isLoading: isDeleting,
    error: deleteError,
  } = useDeleteCampaign();

  return {
    query: { data, isLoading, isError },
    upsert: { upsert, isUpserting, upsertError },
    delete: { deleteCampaign, isDeleting, deleteError },
  };
};

const useGetList = (queryParams?: ListParams) => {
  const { campaignApi, storeId } = useCampaignGraphQL();
  const { first, offset, sortBy, filterBy } = queryParams ?? {};
  const queryKey = [CAMPAIGN, LIST_KEY, first, offset, sortBy, filterBy];

  const queryFn = async () => {
    const query = await campaignApi.campaigns({
      first: first ?? 1000,
      offset: offset ?? 0,
      sort: toSortInput(sortBy),
      filter: filterBy,
      storeId,
    });
    const { nodes, totalCount } = query?.centralServer.campaign.campaigns;
    return { nodes, totalCount };
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};

const toSortInput = (sortBy?: SortBy<CampaignRowFragment>) => ({
  desc: sortBy?.isDesc,
  key: sortBy?.key as CampaignSortFieldInput,
});

const useUpsertCampaign = () => {
  const { campaignApi, queryClient } = useCampaignGraphQL();

  const mutationFn = async (input: UpsertCampaignInput) => {
    await campaignApi.upsertCampaign({ input });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([CAMPAIGN]);
    },
    onError: e => {
      console.error(e);
    },
  });
};

const useDeleteCampaign = () => {
  const { campaignApi, queryClient } = useCampaignGraphQL();

  const mutationFn = async (id: string) => {
    await campaignApi.deleteCampaign({ id });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([CAMPAIGN]);
    },
    onError: e => {
      console.error(e);
    },
  });
};
