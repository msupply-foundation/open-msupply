import {
  FilterBy,
  LIST_KEY,
  MasterListLineSortFieldInput,
  SortBy,
  useParams,
  useQuery,
} from '@openmsupply-client/common';
import { useMasterListGraphQL } from '../useMasterListGraphQL';
import { MASTER_LIST } from './keys';
import { MasterListLineFragment } from '../operations.generated';

export type MasterListLinesParams = {
  sortBy: SortBy<MasterListLineFragment>;
  first: number;
  offset: number;
  filterBy: FilterBy | null;
};

export const useMasterListLines = (queryParams: MasterListLinesParams) => {
  const { id } = useParams();
  const masterListId = id || '';
  const { masterListApi, storeId } = useMasterListGraphQL();
  const { first, offset, sortBy, filterBy } = queryParams;

  const queryKey = [
    MASTER_LIST,
    storeId,
    LIST_KEY,
    masterListId,
    first,
    offset,
    sortBy,
    filterBy,
  ];

  const queryFn = async () => {
    const query = await masterListApi.masterListLines({
      masterListId,
      page: { first, offset },
      sort: {
        desc: !!sortBy.isDesc,
        key: toSortField(sortBy),
      },
      filter: filterBy,
      storeId,
    });
    const { nodes, totalCount } = query?.masterListLines ?? {};
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
  sortBy: SortBy<MasterListLineFragment> | undefined
): MasterListLineSortFieldInput => {
  switch (sortBy?.key) {
    case 'itemCode':
      return MasterListLineSortFieldInput.Code;
    default:
      return MasterListLineSortFieldInput.Name;
  }
};
