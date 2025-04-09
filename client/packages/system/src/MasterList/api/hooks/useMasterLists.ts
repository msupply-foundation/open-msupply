import {
  FilterByWithBoolean,
  LIST_KEY,
  MasterListSortFieldInput,
  SortBy,
  useQuery,
} from '@openmsupply-client/common';
import { useMasterListGraphQL } from '../useMasterListGraphQL';
import { MASTER_LIST } from './keys';
import { MasterListRowFragment } from '../operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<MasterListRowFragment>;
  filterBy?: FilterByWithBoolean | null;
};

export const useMasterLists = (queryParams?: ListParams) => {
  // MASTER LISTS
  const {
    data: masterLists,
    isLoading: isLoadingMasterLists,
    isError: isErrorMasterLists,
  } = useGet(queryParams);

  return {
    masterLists: {
      data: masterLists,
      isLoading: isLoadingMasterLists,
      isError: isErrorMasterLists,
    },
  };
};

const useGet = (queryParams?: ListParams) => {
  const { masterListApi, storeId } = useMasterListGraphQL();
  const { first, offset, sortBy, filterBy } = queryParams ?? {};
  const queryKey = [
    MASTER_LIST,
    storeId,
    LIST_KEY,
    first,
    offset,
    sortBy,
    filterBy,
  ];

  const queryFn = async () => {
    const query = await masterListApi.masterLists({
      first,
      offset,
      key: toSortField(sortBy),
      desc: !!sortBy?.isDesc,
      filter: { ...filterBy, existsForStoreId: { equalTo: storeId } },
      storeId,
    });
    const { nodes, totalCount } = query?.masterLists;
    return { nodes, totalCount };
  };

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn,
  });

  return {
    data,
    isLoading,
    isError,
  };
};

const toSortField = (
  sortBy: SortBy<MasterListRowFragment> | undefined
): MasterListSortFieldInput => {
  switch (sortBy?.key) {
    case 'itemName':
      return MasterListSortFieldInput.Name;
    case 'itemCode':
      return MasterListSortFieldInput.Code;
    case 'description':
      return MasterListSortFieldInput.Description;
    default:
      return MasterListSortFieldInput.Name;
  }
};
