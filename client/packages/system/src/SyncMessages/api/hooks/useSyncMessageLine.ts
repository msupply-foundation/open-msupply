import { useQuery } from '@openmsupply-client/common';
import { useSyncMessageGraphQL } from '../useSyncMessageGraphQL';

import { SyncMessageRowFragment } from '../operations.generated';
import { SYNC_MESSAGE_LINE } from './keys';

export const useSyncMessageLine = (id?: string) => {
  // QUERY
  const { data, isLoading: loading, error } = useGetById(id ?? '');

  // CREATE
  // TODO: Add create mutation

  // UPDATE
  // TODO: Add update mutation

  return {
    query: { data, loading, error },
  };
};

const useGetById = (id: string) => {
  const { syncMessageApi, storeId } = useSyncMessageGraphQL();

  const queryFn = async (): Promise<SyncMessageRowFragment | undefined> => {
    const result = await syncMessageApi.syncMessageById({
      id,
      storeId,
    });

    const syncMessage = result?.centralServer.syncMessage.syncMessage;
    if (syncMessage.__typename === 'SyncMessageNode') return syncMessage;
    else throw new Error(`Could not find sync message ${id}`);
  };

  return useQuery({
    queryKey: [SYNC_MESSAGE_LINE, id],
    queryFn,
  });
};
