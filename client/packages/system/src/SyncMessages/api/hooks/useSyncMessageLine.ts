import { useQuery } from '@openmsupply-client/common';
import { useSyncMessageGraphQL } from '../useSyncMessageGraphQL';

import { SyncMessageRowFragment } from '../operations.generated';
import { SYNC_MESSAGE } from './keys';

export const useSyncMessageLine = (id?: string) => {
  // QUERY
  const { data, isLoading: loading, error } = useGetById(id ?? '');

  // CREATE todo
  // UPDATE todo

  return {
    query: {
      data,
      loading,
      error,
    },
  };
};

const useGetById = (id: string) => {
  const { syncMessageApi, storeId } = useSyncMessageGraphQL();

  const queryFn = async (): Promise<SyncMessageRowFragment | undefined> => {
    const result = await syncMessageApi.SyncMessageById({
      id,
      storeId,
    });
    const syncMessage = result?.centralServer.syncMessage.syncMessage;
    if (syncMessage.__typename === 'SyncMessageNode') return syncMessage;
    else {
      console.error('No sync message found', id);
      throw new Error(`Could not find sync message ${id}`);
    }
  };

  return useQuery({
    queryKey: [SYNC_MESSAGE],
    queryFn,
  });
};
