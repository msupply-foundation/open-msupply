import {
  FilterByWithBoolean,
  FilterRule,
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
  filterBy: FilterByWithBoolean | null;
};

export enum hasStockOnHandInput {
  // Setting these to 'true' or 'false' causes an error.
  True = 'DISPLAY_IN_STOCK_ITEMS',
  False = 'DISPLAY_OUT_OF_STOCK_ITEMS',
}

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

  const mapHasStockOnHandInput = (
    filterInput?: boolean | FilterRule
  ): boolean | undefined => {
    if (typeof filterInput != 'boolean') {
      switch (filterInput?.equalTo) {
        case hasStockOnHandInput.True:
          return true;
        case hasStockOnHandInput.False:
          return false;
        default:
          return undefined;
      }
    } else {
      return undefined;
    }
  };

  const queryFn = async () => {
    let filter: ItemFilterInput = {
      ...filterBy,
      // includes non-visible items that have stock on hand
      isVisibleOrOnHand: true,
      isActive: true,
    };

    if (filterBy?.['hasStockOnHand']) {
      filter = {
        ...filter,
        hasStockOnHand: mapHasStockOnHandInput(filterBy?.['hasStockOnHand']),
      };
    }

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
