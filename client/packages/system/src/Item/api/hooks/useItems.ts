import {
  ItemSortFieldInput,
  SortBy,
  useQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useItemGraphQL } from '../useItemGraphQL';
import { ITEM } from '../keys';
import { ItemRowFragment } from '../operations.generated';

export function useItems() {
  const { data, isLoading, isError } = useGet();
  const { data: vaccineItemsData } = useGetVaccineItems();

  return {
    items: {
      data,
      isLoading,
      isError,
    },
    vaccineItems: {
      data: vaccineItemsData,
    },
  };
}

const useGet = () => {
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

const useGetVaccineItems = () => {
  const { api, storeId } = useItemGraphQL();

  const queryFn = async () => {
    const result = await api.items({
      first: 1000,
      offset: 0,
      key: ItemSortFieldInput.Name,
      desc: false,
      storeId,
      filter: {
        isVaccine: true,
        isActive: true,
        isVisible: true,
      },
    });

    if (result.items.__typename === 'ItemConnector') {
      return result.items;
    }
  };

  return useQuery({
    queryKey: [ITEM],
    queryFn,
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
