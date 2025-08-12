import {
  LIST_KEY,
  SortBy,
  StocktakeFilterInput,
  StocktakeSortFieldInput,
  useQuery,
} from '@openmsupply-client/common';
import { STOCKTAKE } from './keys';
import { useStocktakeGraphQL } from '../useStocktakeGraphQL';
import { StocktakeRowFragment } from '../operations.generated';

export type StocktakesParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<StocktakeSortFieldInput>;
  filter?: StocktakeFilterInput;
};

export const useStocktakeList = (queryParams?: StocktakesParams) => {
  const { data, isLoading, isError } = useGet(queryParams ?? {});

  return {
    query: { data, isLoading, isError },
  };
};

const useGet = (queryParams: StocktakesParams) => {
  const { stocktakeApi, storeId } = useStocktakeGraphQL();

  const { sortBy, first, offset, filter } = queryParams;

  const queryKey = [
    STOCKTAKE,
    storeId,
    LIST_KEY,
    sortBy,
    first,
    offset,
    filter,
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
      filter,
    });
    const { nodes, totalCount } = query?.stocktakes;
    return { nodes, totalCount };
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
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
    case 'stocktakeDate':
      return StocktakeSortFieldInput.StocktakeDate;
    case 'comment':
      return StocktakeSortFieldInput.Comment;
    case 'finalisedDatetime':
      return StocktakeSortFieldInput.FinalisedDatetime;
    default:
      return StocktakeSortFieldInput.CreatedDatetime;
  }
};
