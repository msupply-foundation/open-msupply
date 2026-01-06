import {
  FilterBy,
  LIST_KEY,
  SyncMessageSortFieldInput,
  SortBy,
  useQuery,
} from '@openmsupply-client/common';
import { useSyncMessageGraphQL } from '../useSyncMessageGraphQL';
import { SyncMessageRowFragment } from '../operations.generated';
import { SYNC_MESSAGE } from './keys';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<SyncMessageRowFragment>;
  filterBy: FilterBy | null;
};

export const useSyncMessageList = (queryParams: ListParams) => {
  const { syncMessageApi, storeId } = useSyncMessageGraphQL();

  const {
    sortBy = {
      key: 'number',
      direction: 'desc',
    },
    first,
    offset,
    filterBy,
  } = queryParams;

  const queryKey = [
    SYNC_MESSAGE,
    LIST_KEY,
    storeId,
    sortBy,
    first,
    offset,
    filterBy,
  ];

  const sortFieldMap: Record<string, SyncMessageSortFieldInput> = {
    createdDatetime: SyncMessageSortFieldInput.CreatedDatetime,
    status: SyncMessageSortFieldInput.Status,
  };

  const queryFn = async (): Promise<{
    nodes: SyncMessageRowFragment[];
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
    };

    const query = await syncMessageApi.syncMessages({
      storeId,
      first: first,
      offset: offset,
      key: sortFieldMap[sortBy.key] ?? SyncMessageSortFieldInput.Status,
      desc: sortBy.direction === 'desc',
      filter,
    });
    const { nodes, totalCount } = query?.centralServer.syncMessage.syncMessages;
    return { nodes, totalCount };
  };

  return useQuery({ queryKey, queryFn });
};
