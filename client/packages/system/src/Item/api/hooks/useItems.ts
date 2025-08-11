import {
  ItemNodeType,
  ItemSortFieldInput,
  SortBy,
  useQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useItemGraphQL } from '../useItemGraphQL';
import { ITEM } from '../keys';
import { ItemRowFragment } from '../operations.generated';

const baseFilter = {
  isActive: true,
  isVisible: true,
};

export function useItems(refetchOnMount?: boolean) {
  const { data, isLoading, isError } = useGet();
  const { data: vaccine } = useGetVaccineItems();
  const { data: service, isLoading: serviceLoading } =
    useServiceItems(refetchOnMount);

  return {
    items: {
      data,
      isLoading,
      isError,
    },
    vaccineItems: {
      data: vaccine,
    },
    serviceItems: {
      data: service,
      isLoading: serviceLoading,
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
        ...baseFilter,
        isVaccine: true,
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

const useServiceItems = (refetchOnMount?: boolean) => {
  const { api, storeId } = useItemGraphQL();

  const queryFn = async () => {
    const result = await api.items({
      first: 1000,
      offset: 0,
      key: ItemSortFieldInput.Name,
      desc: false,
      storeId,
      filter: {
        ...baseFilter,
        type: { equalTo: ItemNodeType.Service },
      },
    });

    if (result.items.__typename === 'ItemConnector') {
      return result.items;
    }
  };

  return useQuery({
    queryKey: [ITEM],
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
