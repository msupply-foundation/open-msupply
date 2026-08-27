import { useState } from 'react';
import {
  FnUtils,
  SyncMessageNodeType,
  SyncMessageRowTypeInput,
  useMutation,
  useNotification,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';
import { useSyncMessageGraphQL } from '../useSyncMessageGraphQL';
import { SyncMessageRowFragment } from '../operations.generated';
import { StoreRowFragment } from '../../../Store';
import { SYNC_MESSAGE } from './keys';

export type DraftSyncMessage = {
  body: string;
  type: SyncMessageNodeType;
  toStore?: StoreRowFragment;
};

const defaultDraft: DraftSyncMessage = {
  body: '',
  type: SyncMessageNodeType.SupportUpload,
};

export const useSyncMessage = (id?: string) => {
  const t = useTranslation();
  const { error } = useNotification();

  const { data, isLoading, isError } = useGetById(id);

  const [draft, setDraft] = useState<DraftSyncMessage>(defaultDraft);

  const {
    mutateAsync: createMutation,
    isPending: isCreating,
    error: createError,
  } = useCreate();

  const create = async () => {
    try {
      return await createMutation(draft);
    } catch (e) {
      return error(t('error.failed-to-create-sync-message'))();
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
    const result = await syncMessageApi.syncMessageById({ id, storeId });
    const syncMessage = result.centralServer.syncMessage.syncMessage;
    if (syncMessage.__typename === 'SyncMessageNode') return syncMessage;
    throw new Error(`Could not find sync message ${id}`);
  };

  return useQuery({
    queryKey: [SYNC_MESSAGE, id],
    queryFn,
    enabled: !!id,
  });
};

const useCreate = () => {
  const { syncMessageApi, storeId, queryClient } = useSyncMessageGraphQL();

  const mutationFn = (draft: DraftSyncMessage) =>
    syncMessageApi.insertSyncMessage({
      input: {
        id: FnUtils.generateUUID(),
        body: draft.body,
        type: SyncMessageRowTypeInput.SupportUpload,
        toStoreId: draft.toStore?.id,
      },
      storeId,
    });

  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [SYNC_MESSAGE] }),
  });
};
