import {
  FilterBy,
  ItemFilterInput,
  ItemSortFieldInput,
  SortBy,
  useQuery,
} from '@openmsupply-client/common';
import { useItemGraphQL } from '../useItemGraphQL';
import { ITEM } from '../keys';
import { ItemsWithStatsFragment } from '../operations.generated';

export type ItemParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<ItemsWithStatsFragment>;
  filterBy: FilterBy | null;
};

export const useVisibleOrOnHandItems = (queryParams: ItemParams) => {
  const { api, storeId } = useItemGraphQL();

  const {
    sortBy = {
      key: 'number',
      direction: 'desc',
    },
    filterBy,
    offset,
    first,
  } = queryParams;

  const sortFieldMap: Record<string, ItemSortFieldInput> = {
    code: ItemSortFieldInput.Code,
    name: ItemSortFieldInput.Name,
    type: ItemSortFieldInput.Type,
  };

  const queryFn = async () => {
    const filter: ItemFilterInput = {
      ...filterBy,
      ...getVisibleOrOnHandFilter(
        filterBy?.['hasStockOnHand'] as boolean | undefined
      ),
      isActive: true,
      minMonthsOfStock: filterBy?.['minMonthsOfStock'] as number | undefined,
      maxMonthsOfStock: filterBy?.['maxMonthsOfStock'] as number | undefined,
    };

    const result = await api.itemsWithStats({
      storeId,
      key: sortFieldMap[sortBy.key] ?? ItemSortFieldInput.Code,
      first,
      isDesc: sortBy.direction === 'desc',
      offset,
      filter,
    });

    if (result.items.__typename === 'ItemConnector') {
      return result.items;
    }
  };

  return useQuery({
    queryKey: [ITEM, queryParams],
    queryFn,
  });
};

const getVisibleOrOnHandFilter = (hasStockOnHand?: boolean) => {
  switch (hasStockOnHand) {
    case true:
      // All items with stock currently in the store, including non-visible items
      return { hasStockOnHand: true };

    case false:
      // All items with no stock in store. Should only include visible items.
      return { hasStockOnHand: false, isVisible: true };

    case undefined:
      // include non-visible items that have stock on hand
      return { isVisibleOrOnHand: true };
  }
};

interface ItemHookProps {
  filterBy?: ItemFilterInput;
  refetchOnMount?: boolean;
}

export const useItemsByFilter = ({
  filterBy = {},
  refetchOnMount = false,
}: ItemHookProps = {}) => {
  const { api, storeId } = useItemGraphQL();

  const queryFn = async () => {
    const result = await api.items({
      first: 1000,
      offset: 0,
      key: ItemSortFieldInput.Name,
      desc: false,
      storeId,
      filter: {
        isActive: true,
        isVisible: true,
        ...filterBy,
      },
    });

    if (result.items.__typename === 'ItemConnector') {
      return result.items;
    }
  };

  return useQuery({
    queryKey: [ITEM, filterBy],
    queryFn,
    refetchOnMount,
  });
};
