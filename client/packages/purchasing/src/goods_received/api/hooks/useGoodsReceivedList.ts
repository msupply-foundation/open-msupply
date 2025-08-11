import {
  FilterByWithBoolean,
  GoodsReceivedSortFieldInput,
  SortBy,
  useQuery,
  useTableStore,
} from '@openmsupply-client/common';
import { useGoodsReceivedGraphQL } from '../useGoodsReceivedGraphQL';
import { LIST, GOODS_RECEIVED } from './keys';
import {
  GoodsReceivedFragment,
  GoodsReceivedRowFragment,
} from '../operations.generated';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<GoodsReceivedFragment>;
  filterBy: FilterByWithBoolean | null;
};

export const useGoodsReceivedList = (queryParams: ListParams) => {
  const { goodsReceivedApi, storeId } = useGoodsReceivedGraphQL();

  const {
    sortBy = {
      key: 'createdDatetime',
      direction: 'desc',
    },
    first,
    offset,
    filterBy,
  } = queryParams;

  const queryKey = [
    GOODS_RECEIVED,
    LIST,
    storeId,
    sortBy,
    first,
    offset,
    filterBy,
  ];

  const sortFieldMap: Record<string, GoodsReceivedSortFieldInput> = {
    createdDatetime: GoodsReceivedSortFieldInput.CreatedDatetime,
    // Add more as required
  };

  const queryFn = async (): Promise<{
    nodes: GoodsReceivedRowFragment[];
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
    };

    const query = await goodsReceivedApi.goodsReceivedList({
      storeId,
      first: first,
      offset: offset,
      key:
        sortFieldMap[sortBy.key] ?? GoodsReceivedSortFieldInput.CreatedDatetime,
      desc: sortBy.direction === 'desc',
      filter,
    });
    const { nodes, totalCount } = query?.goodsReceivedList;
    return { nodes, totalCount };
  };

  const { data, isLoading, isError } = useQuery({ queryKey, queryFn });

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as GoodsReceivedFragment[],
  }));

  return {
    query: { data, isLoading, isError },
    selectedRows,
  };
};
