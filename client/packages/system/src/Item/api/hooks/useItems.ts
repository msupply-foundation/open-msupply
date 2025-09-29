import {
  ItemFilterInput,
  ItemSortFieldInput,
  SortBy,
  useQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useItemGraphQL } from '../useItemGraphQL';
import { ITEM } from '../keys';
import { ItemRowFragment } from '../operations.generated';

export const useVisibleOrOnHandItems = () => {
  const { api, storeId } = useItemGraphQL();
  const { queryParams } = useUrlQueryParams({
    filters: [{ key: 'codeOrName' }],
  });
  const { filterBy, sortBy, offset, first } = queryParams;

  const queryFn = async () => {
    const result = await api.itemsWithStats({
      storeId,
      key: toSortField(sortBy),
      first,
      isDesc: sortBy.isDesc,
      offset,
      filter: {
        ...filterBy,
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
  pagination?: { first?: number; offset?: number };
}

export const useItemsByFilter = ({
  filterBy = {},
  refetchOnMount = false,
  pagination = { first: 1000, offset: 0 },
}: ItemHookProps = {}) => {
  const { api, storeId } = useItemGraphQL();

  const queryFn = async () => {
    const result = await api.items({
      ...pagination,
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

const toSortField = (sortBy: SortBy<ItemRowFragment>) => {
  switch (sortBy.key) {
    case 'name':
      return ItemSortFieldInput.Name;
    case 'code':
      return ItemSortFieldInput.Code;
    default:
      return ItemSortFieldInput.Name;
  }
};
