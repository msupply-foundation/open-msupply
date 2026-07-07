import { useState } from 'react';
import { SiteRowFragment } from '../operations.generated';
import { useSiteGraphQL } from '../useSiteGraphQL';
import { SITE } from './keys';
import {
  SortBy,
  useQuery,
  useMutation,
  useTranslation,
  keepPreviousData,
  LIST_KEY,
  SiteFilterInput,
  SiteSortFieldInput,
  SyncVersionNode,
} from '@openmsupply-client/common';

type ListParams = {
  sortBy: SortBy<SiteRowFragment>;
  first?: number;
  offset?: number;
  filterBy?: SiteFilterInput | null;
};

export type DraftSite = {
  id: number;
  code: string;
  name: string;
  password: string;
  hardwareId?: string | null;
  syncVersion?: SyncVersionNode | null;
  isMultiDevice: boolean;
  isNew: boolean;
};

export const defaultDraftSite: DraftSite = {
  id: 0,
  code: '',
  name: '',
  password: '',
  hardwareId: undefined,
  syncVersion: undefined,
  isMultiDevice: false,
  isNew: true,
};

export const useSites = (queryParams?: ListParams) => {
  const [draft, setDraft] = useState<DraftSite>(defaultDraftSite);

  const { data, isFetching, isError } = useGetList(queryParams);

  const updateDraft = (patch: Partial<DraftSite>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  };

  const {
    mutateAsync: upsertMutation,
    isPending: isUpserting,
    error: upsertError,
  } = useUpsertSite();

  const {
    mutateAsync: deleteMutation,
    isPending: isDeleting,
    error: deleteError,
  } = useDeleteSite();

  const {
    mutateAsync: clearSyncTokenMutation,
    isPending: isClearingSyncToken,
    error: clearSyncTokenError,
  } = useClearSiteToken();

  const {
    mutateAsync: clearHardwareIdMutation,
    isPending: isClearingHardwareId,
    error: clearHardwareIdError,
  } = useClearHardwareId();

  const { mutateAsync: setMultiDeviceMutation } = useSetMultiDevice();

  const upsert = async () => {
    return await upsertMutation(draft);
  };

  const deleteSite = async (siteId: number) => {
    return await deleteMutation(siteId);
  };

  const clearSyncToken = async (siteId: number) => {
    return await clearSyncTokenMutation(siteId);
  };

  // Wrap so the draft reflects the cleared state without waiting for the
  // refetch — keeps the modal UI in sync with the mutation.
  const clearHardwareId = async (siteId: number) => {
    const result = await clearHardwareIdMutation(siteId);
    updateDraft({ hardwareId: null });
    return result;
  };

  // Wrap so the draft reflects the new flag immediately.
  const setMultiDevice = async (siteId: number, isMultiDevice: boolean) => {
    const result = await setMultiDeviceMutation({ siteId, isMultiDevice });
    updateDraft({ isMultiDevice });
    return result;
  };

  return {
    query: { data, isFetching, isError },
    upsert: { upsert, isUpserting, upsertError },
    deleteSite: { deleteSite, isDeleting, deleteError },
    clearSyncToken: {
      clearSyncToken,
      isClearingSyncToken,
      clearSyncTokenError,
    },
    clearHardwareId: {
      clearHardwareId,
      isClearingHardwareId,
      clearHardwareIdError,
    },
    setMultiDevice: { setMultiDevice },
    draft,
    updateDraft,
  };
};

const useGetList = (queryParams?: ListParams) => {
  const { siteApi } = useSiteGraphQL();
  const { first, offset, sortBy, filterBy } = queryParams ?? {};
  const queryKey = [SITE, LIST_KEY, first, offset, sortBy, filterBy];

  const queryFn = async () => {
    const query = await siteApi.sites({
      first: first ?? 1000,
      offset: offset ?? 0,
      sort: toSortInput(sortBy),
      filter: filterBy,
    });
    const { nodes, totalCount } = query?.centralServer?.site?.sites ?? {
      nodes: [],
      totalCount: 0,
    };
    return { nodes, totalCount };
  };

  return useQuery({ queryKey, queryFn, placeholderData: keepPreviousData });
};

const toSortInput = (sortBy?: SortBy<SiteRowFragment>) => ({
  desc: sortBy?.isDesc,
  key: (sortBy?.key as SiteSortFieldInput) || SiteSortFieldInput.Name,
});

enum UpsertSiteError {
  CodeRequired = 'CodeRequired',
  NameRequired = 'NameRequired',
  PasswordRequired = 'PasswordRequired',
}

const useUpsertSite = () => {
  const { siteApi, queryClient } = useSiteGraphQL();
  const t = useTranslation();

  const mutationFn = async (draft: DraftSite) => {
    const result = await siteApi.upsertSite({
      input: {
        id: draft.id,
        code: draft.code || undefined,
        name: draft.name,
        password: draft.password || undefined,
      },
    });
    const upsertResult = result?.centralServer?.site?.upsertSite;

    if (upsertResult?.__typename === 'SiteNode') {
      return upsertResult;
    }

    if (upsertResult?.__typename === 'UpsertSiteError') {
      switch (upsertResult.error.__typename) {
        case UpsertSiteError.CodeRequired:
          throw new Error(
            t('error.field-must-be-specified', {
              field: t('label.code'),
            })
          );
        case UpsertSiteError.NameRequired:
          throw new Error(
            t('error.field-must-be-specified', {
              field: t('label.name'),
            })
          );
        case UpsertSiteError.PasswordRequired:
          throw new Error(
            t('error.field-must-be-specified', {
              field: t('label.settings-password'),
            })
          );
        default:
          throw new Error(t('error.unable-to-save-site'));
      }
    }

    throw new Error(t('error.unable-to-save-site'));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITE] });
    },
    onError: (e: unknown) => {
      console.error(e);
    },
  });
};

enum DeleteSiteError {
  SiteHasStores = 'SiteHasStores',
  CannotDeleteCentralSite = 'CannotDeleteCentralSite',
}

const useDeleteSite = () => {
  const { siteApi, queryClient } = useSiteGraphQL();
  const t = useTranslation();

  const mutationFn = async (siteId: number) => {
    const result = await siteApi.deleteSite({ siteId });
    const deleteResult = result?.centralServer?.site?.deleteSite;

    if (deleteResult?.__typename === 'DeleteSiteNode') {
      return deleteResult;
    }

    if (deleteResult?.__typename === 'DeleteSiteError') {
      switch (deleteResult.error.__typename) {
        case DeleteSiteError.SiteHasStores:
          throw new Error(t('error.site-has-stores'));
        case DeleteSiteError.CannotDeleteCentralSite:
          throw new Error(t('error.cannot-delete-central-site'));
        default:
          throw new Error(t('error.unable-to-delete-site'));
      }
    }

    throw new Error(t('error.unable-to-delete-site'));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITE] });
    },
    onError: (e: unknown) => {
      console.error(e);
    },
  });
};

const useClearSiteToken = () => {
  const { siteApi, queryClient } = useSiteGraphQL();

  const mutationFn = async (siteId: number) => {
    const result = await siteApi.clearSiteToken({ siteId });
    return result?.centralServer?.site?.clearSiteToken;
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITE] });
    },
    onError: (e: unknown) => {
      console.error(e);
    },
  });
};

const useClearHardwareId = () => {
  const { siteApi, queryClient } = useSiteGraphQL();

  const mutationFn = async (siteId: number) => {
    const result = await siteApi.clearSiteHardwareId({ siteId });
    return result?.centralServer?.site?.clearSiteHardwareId;
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITE] });
    },
    onError: (e: unknown) => {
      console.error(e);
    },
  });
};

const useSetMultiDevice = () => {
  const { siteApi, queryClient } = useSiteGraphQL();

  const mutationFn = async ({
    siteId,
    isMultiDevice,
  }: {
    siteId: number;
    isMultiDevice: boolean;
  }) => {
    const result = await siteApi.setSiteMultiDevice({ siteId, isMultiDevice });
    return result?.centralServer?.site?.setSiteMultiDevice;
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITE] });
    },
    onError: (e: unknown) => {
      console.error(e);
    },
  });
};
