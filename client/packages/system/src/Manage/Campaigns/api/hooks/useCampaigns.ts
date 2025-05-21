import { useState } from 'react';
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
  FnUtils,
  Formatter,
} from '@openmsupply-client/common';

type ListParams = {
  sortBy: SortBy<CampaignRowFragment>;
  first?: number;
  offset?: number;
  filterBy?: CampaignFilterInput | null;
};

export type DraftCampaign = {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
};

export const defaultDraftCampaign: DraftCampaign = {
  id: '',
  name: '',
  startDate: null,
  endDate: null,
};

export const useCampaigns = (queryParams?: ListParams) => {
  const [draft, setDraft] = useState<DraftCampaign>(defaultDraftCampaign);

  // QUERY
  const { data, isLoading, isError } = useGetList(queryParams);

  // UPDATE DRAFT
  const updateDraft = (patch: Partial<DraftCampaign>) => {
    setDraft({ ...draft, ...patch });
  };

  // UPSERT
  const {
    mutateAsync: upsertMutation,
    isLoading: isUpserting,
    error: upsertError,
  } = useUpsertCampaign();

  const upsert = async () => {
    await upsertMutation(draft);
    // To-DO: handle error
  };

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
    draft,
    updateDraft,
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

  const mutationFn = async (draft: DraftCampaign) => {
    const startDate = draft.startDate
      ? Formatter.naiveDate(draft.startDate)
      : null;

    const endDate = draft.endDate ? Formatter.naiveDate(draft.endDate) : null;

    const input = {
      id: draft.id || FnUtils.generateUUID(),
      name: draft.name,
      startDate,
      endDate,
    };
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
