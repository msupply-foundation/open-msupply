import { useState } from 'react';
import { CampaignRowFragment } from '../operations.generated';
import { useCampaignGraphQL } from '../useCampaignGraphQL';
import { CAMPAIGN } from './keys';
import {
  SortBy,
  useQuery,
  useMutation,
  keepPreviousData,
  LIST_KEY,
  CampaignFilterInput,
  CampaignSortFieldInput,
  FnUtils,
  useIntlUtils,
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
  code: string;
};

export const defaultDraftCampaign: DraftCampaign = {
  id: '',
  name: '',
  code: '',
};

export const useCampaigns = (queryParams?: ListParams) => {
  const [draft, setDraft] = useState<DraftCampaign>(defaultDraftCampaign);

  // QUERY
  const { data, isFetching, isError } = useGetList(queryParams);

  // UPDATE DRAFT
  const updateDraft = (patch: Partial<DraftCampaign>) => {
    setDraft({ ...draft, ...patch });
  };

  // UPSERT
  const {
    mutateAsync: upsertMutation,
    isPending: isUpserting,
    error: upsertError,
  } = useUpsertCampaign();

  const upsert = async () => {
    return await upsertMutation(draft);
  };

  const deleteCampaign = async (id: string) => {
    return await deleteMutation(id);
  };

  // DELETE
  const {
    mutateAsync: deleteMutation,
    isPending: isDeleting,
    error: deleteError,
  } = useDeleteCampaign();

  return {
    query: { data, isFetching, isError },
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
    const { nodes, totalCount } = query?.campaigns;
    return { nodes, totalCount };
  };

  const query = useQuery({
    queryKey,
    queryFn,
    placeholderData: keepPreviousData,
  });
  return query;
};

const toSortInput = (sortBy?: SortBy<CampaignRowFragment>) => ({
  desc: sortBy?.isDesc,
  key: (sortBy?.key as CampaignSortFieldInput) || CampaignSortFieldInput.Name,
});

const useUpsertCampaign = () => {
  const { campaignApi, queryClient } = useCampaignGraphQL();
  const { translateServerError } = useIntlUtils();

  const mutationFn = async (draft: DraftCampaign) => {
    const input = {
      id: draft.id || FnUtils.generateUUID(),
      name: draft.name,
      // Always sent, so clearing the field clears the code
      code: draft.code?.trim() ?? '',
    };
    try {
      const result = await campaignApi.upsertCampaign({ input });
      return result?.centralServer?.campaign?.upsertCampaign;
    } catch (error) {
      // For a bad request, server returns a GraphQL standard error
      return {
        __typename: 'UpsertCampaignError',
        error: { description: translateServerError((error as Error)?.message) },
      };
    }
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CAMPAIGN]
      });
    },
    onError: e => {
      console.error(e);
    },
  });
};

const useDeleteCampaign = () => {
  const { campaignApi, queryClient } = useCampaignGraphQL();
  const { translateServerError } = useIntlUtils();

  const mutationFn = async (id: string) => {
    try {
      const result = await campaignApi.deleteCampaign({ id });
      return result?.centralServer?.campaign?.deleteCampaign;
    } catch (error) {
      return {
        __typename: 'DeleteCampaignError',
        error: { description: translateServerError((error as Error)?.message) },
      };
    }
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CAMPAIGN]
      });
    },
    onError: e => {
      console.error(e);
    },
  });
};
