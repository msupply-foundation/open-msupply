import {
  LIST_KEY,
  SortBy,
  StocktakeFilterInput,
  StocktakeSortFieldInput,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { STOCKTAKE } from './keys';
import { useStocktakeGraphQL } from '../useStocktakeGraphQL';
import { StocktakeRowFragment } from '../operations.generated';

export type StocktakesParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<StocktakeSortFieldInput>;
  filterBy?: StocktakeFilterInput | null;
};

export const useStocktakeList = (queryParams?: StocktakesParams) => {
  const { data, isFetching, isError } = useGet(queryParams ?? {});
  const { deleteStocktakes } = useDelete();
  const { data: hasStocktake } = useHasStocktake();

  return {
    query: { data, isFetching, isError },
    delete: { deleteStocktakes },
    hasStocktake: hasStocktake ?? false,
  };
};

const useGet = (queryParams: StocktakesParams) => {
  const { stocktakeApi, storeId } = useStocktakeGraphQL();

  const { sortBy, first, offset, filterBy } = queryParams;

  const queryKey = [
    STOCKTAKE,
    storeId,
    LIST_KEY,
    sortBy,
    first,
    offset,
    filterBy,
  ];
  const sort = sortBy?.key
    ? sortBy
    : {
        key: StocktakeSortFieldInput.CreatedDatetime,
        direction: 'desc' as 'asc' | 'desc',
        isDesc: true,
      };

  const queryFn = async (): Promise<{
    nodes: StocktakeRowFragment[];
    totalCount: number;
  }> => {
    const query = await stocktakeApi.stocktakes({
      storeId,
      page: { offset, first },
      sort: {
        key: toSortField(sort),
        desc: !!sort.isDesc,
      },
      filter: filterBy,
    });
    const { nodes, totalCount } = query?.stocktakes;
    return { nodes, totalCount };
  };

  const query = useQuery({ queryKey, queryFn, keepPreviousData: true });
  return query;
};

const useHasStocktake = () => {
  const { stocktakeApi, storeId } = useStocktakeGraphQL();
  const queryKey = [STOCKTAKE, storeId];

  const queryFn = async () => {
    const result = await stocktakeApi.stocktakes({
      storeId,
      page: { offset: 0, first: 1 },
    });
    return result?.stocktakes?.nodes.length > 0;
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
};

const useDelete = () => {
  const { stocktakeApi, storeId, queryClient } = useStocktakeGraphQL();

  const mutationFn = async (stocktakes: StocktakeRowFragment[]) => {
    const result = await stocktakeApi.deleteStocktakes({
      ids: stocktakes.map(stocktake => ({ id: stocktake.id })),
      storeId,
    });
    return result.batchStocktake;
  };

  const { mutateAsync: deleteMutation } = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([STOCKTAKE]);
    },
  });

  const deleteStocktakes = async (selectedRows: StocktakeRowFragment[]) => {
    if (selectedRows.length === 0) return;
    await deleteMutation(selectedRows);
  };

  return {
    deleteStocktakes,
  };
};

const toSortField = (
  sortBy: SortBy<StocktakeSortFieldInput>
): StocktakeSortFieldInput => {
  switch (sortBy.key) {
    case 'stocktakeNumber':
      return StocktakeSortFieldInput.StocktakeNumber;
    case 'status':
      return StocktakeSortFieldInput.Status;
    case 'description':
      return StocktakeSortFieldInput.Description;
    case 'createdDatetime':
      return StocktakeSortFieldInput.CreatedDatetime;
    case 'comment':
      return StocktakeSortFieldInput.Comment;
    case 'finalisedDatetime':
      return StocktakeSortFieldInput.FinalisedDatetime;
    default:
      return StocktakeSortFieldInput.CreatedDatetime;
  }
};
