import {
  FilterBy,
  GoodsReceivedSortFieldInput,
  SortBy,
  useMutation,
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
  filterBy: FilterBy | null;
};

export const useGoodsReceivedList = (queryParams?: ListParams) => {
  const { data, isLoading, isError, refetch } = useGet(
    queryParams ?? { filterBy: null }
  );
  const { deleteGoodsReceived, selectedRows } = useDeleteLines(data?.nodes);

  return {
    query: { data, isLoading, isError, fetchAllGoodsReceived: refetch },
    delete: {
      deleteGoodsReceived,
      selectedRows,
    },
  };
};

const useGet = (queryParams: ListParams) => {
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

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};

const useDeleteLines = (goodsReceived?: GoodsReceivedRowFragment[]) => {
  const { goodsReceivedApi, storeId, queryClient } = useGoodsReceivedGraphQL();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => goodsReceived?.find(({ id }) => selectedId === id))
      .filter(Boolean) as GoodsReceivedFragment[],
  }));

  const mutationFn = async (id: string) => {
    const result = await goodsReceivedApi.deleteGoodsReceived({
      id,
      storeId,
    });
    return result.deleteGoodsReceived;
  };

  const { mutateAsync: deleteMutation } = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([GOODS_RECEIVED, LIST, storeId]);
    },
  });

  const deleteGoodsReceived = async () => {
    await Promise.all(
      selectedRows.map(async ({ id }) => {
        try {
          await deleteMutation(id);
        } catch (error) {
          throw new Error(
            `Failed to delete Goods Received with id ${id}: ${error}`
          );
        }
      })
    );
  };

  return {
    deleteGoodsReceived,
    selectedRows,
  };
};
