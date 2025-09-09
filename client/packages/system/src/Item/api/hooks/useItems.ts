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

  // if both less than months of stock and more than months of stock filters are being used, return nothing.
  if (
    filterBy?.['lessThanMonthsOfStock'] &&
    filterBy?.['moreThanMonthsOfStock']
  ) {
    return { data: undefined, isError: undefined, isLoading: undefined };
  }

  const sortFieldMap: Record<string, ItemSortFieldInput> = {
    code: ItemSortFieldInput.Code,
    name: ItemSortFieldInput.Name,
    type: ItemSortFieldInput.Type,
  };

  const mapHasStockOnHandInput = (
    filterInput?: boolean | FilterRule
  ): boolean | undefined => {
    console.log('mapHasStockOnHandInput');
    if (typeof filterInput != 'boolean') {
      console.log('equalTo is', filterInput?.equalTo);
      switch (filterInput?.equalTo) {
        case hasStockOnHandInput.True:
          console.log('so mapped to true!');
          return true;
        case hasStockOnHandInput.False:
          console.log('so mapped to false!');
          return false;
        default:
          console.log('mapped to undefined!');
          return undefined;
      }
    } else {
      console.log('mapped to undefined!');
      return undefined;
    }
  };

  const mapMonthsOfStockInput = (
    filterInput?: boolean | FilterRule
  ): number | undefined => {
    console.log('mapMonthsOfStockInput');
    if (filterInput && typeof filterInput != 'boolean') {
      console.log('equalTo is', filterInput?.equalTo);
      if (typeof filterInput.equalTo === 'string') {
        console.log('which is of type string');
        console.log('and when parseInted is', parseInt(filterInput?.equalTo));
        return parseInt(filterInput?.equalTo);
      }
    } else {
      console.log('mapped to undefined!');
      return undefined;
    }
  };

  const queryFn = async () => {
    console.log('filterBy:', filterBy);

    let filter: ItemFilterInput = {
      ...filterBy,
      // includes non-visible items that have stock on hand
      isVisibleOrOnHand: true,
      isActive: true,
    };

    console.log('filter initialised:', filter);

    // if using the hasStockOnHand filter, extract the value we want and send only that to the backend
    if (filterBy?.['hasStockOnHand']) {
      console.log('hasStockOnHand filter enabled');
      filter = {
        ...filter,
        hasStockOnHand: mapHasStockOnHandInput(filterBy?.['hasStockOnHand']),
      };
      console.log('filter changed to:', filter);
    }

    // if using the moreThanMonthsOfStock filter, extract the value we want and send only that to the backend
    if (filterBy?.['moreThanMonthsOfStock']) {
      console.log('moreThanMonthsOfStock filter enabled');
      filter = {
        ...filter,
        moreThanMonthsOfStock: mapMonthsOfStockInput(
          filterBy?.['moreThanMonthsOfStock']
        ),
      };
      console.log('filter changed to:', filter);
    }

    // if using the lessThanMonthsOfStock filter, extract the value we want and send only that to the backend
    if (filterBy?.['lessThanMonthsOfStock']) {
      console.log('lessThanMonthsOfStock filter enabled');
      filter = {
        ...filter,
        lessThanMonthsOfStock: mapMonthsOfStockInput(
          filterBy?.['lessThanMonthsOfStock']
        ),
      };
      console.log('filter changed to:', filter);
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
