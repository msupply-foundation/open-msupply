import {
  FilterByWithBoolean,
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

  console.log('filterBy:', filterBy); // filterBy = Object { inStock: Object { equalTo: true } }

  console.log('filter:', {
    ...filterBy,

    isVisibleOrOnHand: true,
    isActive: true,
  });

  const queryFn = async () => {
    const result = await api.itemsWithStats({
      storeId,
      key: sortFieldMap[sortBy.key] ?? ItemSortFieldInput.Code,
      first,
      isDesc: sortBy.direction === 'desc',
      offset,
      filter: {
        ...filterBy,
        ...(filterBy?.['hasStockOnHand'] && { hasStockOnHand: true }),
        // includes non-visible items that have stock on hand
        isVisibleOrOnHand: true,
        isActive: true,
      },
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
