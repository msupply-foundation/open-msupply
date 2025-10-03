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
  const { data, isFetching, isError } = useGetList(queryParams);

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
    return await upsertMutation(draft);
  };

  const deleteCampaign = async (id: string) => {
    return await deleteMutation(id);
  };

  // DELETE
  const {
    mutateAsync: deleteMutation,
    isLoading: isDeleting,
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
    keepPreviousData: true,
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
    // If the dates have been modified, they will be Date objects, but initial
    // value from database is string/null
    const startDate =
      draft.startDate instanceof Date
        ? Formatter.naiveDate(draft.startDate)
        : draft.startDate;

    const endDate =
      draft.endDate instanceof Date
        ? Formatter.naiveDate(draft.endDate)
        : draft.endDate;

    const input = {
      id: draft.id || FnUtils.generateUUID(),
      name: draft.name,
      startDate,
      endDate,
    };
    try {
      const result = await campaignApi.upsertCampaign({ input });
      return result?.centralServer?.campaign?.upsertCampaign;
    } catch (error) {
      // For invalid dates, server returns a GraphQL standard error
      return {
        __typename: 'UpsertCampaignError',
        error: { description: translateServerError((error as Error)?.message) },
      };
    }
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
      queryClient.invalidateQueries([CAMPAIGN]);
    },
    onError: e => {
      console.error(e);
    },
  });
};
