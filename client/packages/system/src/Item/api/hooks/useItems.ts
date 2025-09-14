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
  True = 'yes',
  False = 'no',
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

  const mapMonthsOfStockInput = (
    filterInput?: boolean | FilterRule
  ): number | undefined => {
    if (filterInput && typeof filterInput != 'boolean') {
      if (typeof filterInput.equalTo === 'string') {
        return parseInt(filterInput?.equalTo);
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

    // if using the hasStockOnHand filter, extract the value we want and send only that to the backend
    if (filterBy?.['hasStockOnHand']) {
      filter = {
        ...filter,
        isVisibleOrOnHand: undefined,
        hasStockOnHand: mapHasStockOnHandInput(filterBy?.['hasStockOnHand']),
      };
    }

    // if using the minMonthsOfStock filter, extract the value we want and send only that to the backend
    if (filterBy?.['minMonthsOfStock']) {
      filter = {
        ...filter,
        minMonthsOfStock: mapMonthsOfStockInput(filterBy?.['minMonthsOfStock']),
      };
    }

    // if using the maxMonthsOfStock filter, extract the value we want and send only that to the backend
    if (filterBy?.['maxMonthsOfStock']) {
      filter = {
        ...filter,
        maxMonthsOfStock: mapMonthsOfStockInput(filterBy?.['maxMonthsOfStock']),
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
