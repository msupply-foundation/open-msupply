import {
  FilterBy,
  LIST_KEY,
  SyncMessageSortFieldInput,
  SortBy,
  keepPreviousData,
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

const sortFieldMap: Record<string, SyncMessageSortFieldInput> = {
  createdDatetime: SyncMessageSortFieldInput.CreatedDatetime,
  status: SyncMessageSortFieldInput.Status,
};

export const useSyncMessageList = (queryParams: ListParams) => {
  const { syncMessageApi, storeId } = useSyncMessageGraphQL();

  const {
    sortBy = { key: 'createdDatetime', direction: 'desc' },
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

  const queryFn = async (): Promise<{
    nodes: SyncMessageRowFragment[];
    totalCount: number;
  }> => {
    const result = await syncMessageApi.syncMessages({
      storeId,
      first,
      offset,
      key: sortFieldMap[sortBy.key] ?? SyncMessageSortFieldInput.CreatedDatetime,
      desc: sortBy.direction === 'desc',
      filter: { ...filterBy },
    });
    const { nodes, totalCount } = result.centralServer.syncMessage.syncMessages;
    return { nodes, totalCount };
  };

  const { data, isFetching, isError } = useQuery({
    queryKey,
    queryFn,
    placeholderData: keepPreviousData,
  });

  return { query: { data, isFetching, isError } };
};
