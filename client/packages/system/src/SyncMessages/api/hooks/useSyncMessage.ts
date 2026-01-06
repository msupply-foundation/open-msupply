import {
  FnUtils,
  InsertSyncMessageInput,
  SyncMessageNodeStatus,
  SyncMessageNodeType,
  SyncMessageRowTypeInput,
  useMutation,
  useNotification,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';
import { useSyncMessageGraphQL } from '../useSyncMessageGraphQL';

import { SyncMessageRowFragment } from '../operations.generated';
import { SYNC_MESSAGE } from './keys';
import { useState } from 'react';

const draftSyncMessage: SyncMessageRowFragment = {
  __typename: 'SyncMessageNode',
  id: '',
  body: '',
  type: SyncMessageNodeType.SupportUpload,
  status: SyncMessageNodeStatus.New,
  createdDatetime: '',
  toStore: {
    __typename: 'StoreNode',
    id: '',
    code: '',
    storeName: '',
  },
  fromStore: {
    __typename: 'StoreNode',
    id: '',
    code: '',
    storeName: '',
  },
};

export const useSyncMessage = (id?: string) => {
  const t = useTranslation();
  const { error } = useNotification();

  // QUERY
  const { data, isLoading, isError } = useGetById(id);

  // DRAFT
  const [draft, setDraft] = useState(draftSyncMessage);

  // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const create = async () => {
    try {
      return await createMutation(draft);
    } catch (e) {
      const errorSnack = error(`${t('error.failed-to-create-sync-message')}`);
      return errorSnack();
    }
  };

  return {
    query: { data, isLoading, isError },
    create: { create, isCreating, createError },
    draft,
    setDraft,
  };
};

const useGetById = (id?: string) => {
  const { syncMessageApi, storeId } = useSyncMessageGraphQL();

  const queryFn = async (): Promise<SyncMessageRowFragment | undefined> => {
    if (!id) return;
    const result = await syncMessageApi.syncMessageById({
      id,
      storeId,
    });

    const syncMessage = result?.centralServer.syncMessage.syncMessage;
    if (syncMessage.__typename === 'SyncMessageNode') return syncMessage;
    else throw new Error(`Could not find sync message ${id}`);
  };

  return useQuery({
    queryKey: [SYNC_MESSAGE, id],
    queryFn,
  });
};

const useCreate = () => {
  const { syncMessageApi, storeId, queryClient } = useSyncMessageGraphQL();

  const typeConversion = (type: SyncMessageNodeType) => {
    switch (type) {
      case SyncMessageNodeType.SupportUpload:
        return SyncMessageRowTypeInput.SupportUpload;
      case SyncMessageNodeType.RequestFieldChange:
      default:
        return SyncMessageRowTypeInput.RequestFieldChange;
    }
  };

  const parseInput = (
    draft: SyncMessageRowFragment
  ): InsertSyncMessageInput => {
    return {
      id: FnUtils.generateUUID(),
      body: draft?.body,
      type: typeConversion(draft?.type),
      toStoreId: draft?.toStore?.id,
    };
  };

  const mutationFn = async (draft: SyncMessageRowFragment) => {
    return await syncMessageApi.insertSyncMessage({
      input: parseInput(draft),
      storeId,
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([SYNC_MESSAGE]),
  });
};
