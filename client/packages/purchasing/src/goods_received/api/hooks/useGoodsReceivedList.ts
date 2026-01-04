import {
  FilterBy,
  GoodsReceivedSortFieldInput,
  SortBy,
  useMutation,
  useQuery,
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
  const { data, isLoading, isError, refetch, isFetching } = useGet(
    queryParams ?? { filterBy: null }
  );
  const { deleteGoodsReceived } = useDeleteLines();

  return {
    query: {
      data,
      isLoading,
      isError,
      isFetching,
      fetchAllGoodsReceived: refetch,
    },
    delete: {
      deleteGoodsReceived,
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
    keepPreviousData: true,
  });
  return query;
};

const useDeleteLines = () => {
  const { goodsReceivedApi, storeId, queryClient } = useGoodsReceivedGraphQL();

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

  const deleteGoodsReceived = async (
    selectedRows: GoodsReceivedRowFragment[]
  ) => {
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
  };
};
