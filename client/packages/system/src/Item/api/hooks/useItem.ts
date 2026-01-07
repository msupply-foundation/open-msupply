import { ItemNodeType, useParams, useQuery } from '@openmsupply-client/common';
import { useItemGraphQL } from '../useItemGraphQL';
import { useItemApi } from './useItemApi';
import { useItemsByFilter } from './useItems';

export function useItem(id?: string) {
  const { id: paramId = '' } = useParams();

  const itemId = id || paramId;

  const { data, isLoading, error } = useGetById(itemId);
  const { data: stockLinesFromItem, isLoading: stockLinesIsLoading } =
    useStockLinesFromItem(itemId);

  const { data: serviceItems, isLoading: serviceItemsLoading } =
    useItemsByFilter({
      filterBy: {
        type: { equalTo: ItemNodeType.Service },
      },
    });
  const defaultServiceItem =
    serviceItems?.nodes.find(({ code }) => code === 'service') ??
    serviceItems?.nodes?.[0];

  return {
    byId: { data, isLoading, error },
    stockLinesFromItem: {
      data: stockLinesFromItem,
      isLoading: stockLinesIsLoading,
    },
    serviceItem: {
      data: defaultServiceItem,
      isLoading: serviceItemsLoading,
    },
  };
}

export const useGetById = (itemId: string) => {
  const { api, storeId } = useItemGraphQL();
  const { keys } = useItemApi();

  const queryFn = async () => {
    const result = await api.itemById({
      storeId,
      itemId,
    });

    if (result.items.__typename === 'ItemConnector') {
      return result.items.nodes[0];
    }
  };

  const query = useQuery({
    queryKey: keys.detail(itemId),
    queryFn,
    enabled: !!itemId,
  });

  return query;
};

const useStockLinesFromItem = (itemId: string) => {
  const queryState = useGetById(itemId);
  const { data } = queryState;
  const { availableBatches } = data ?? {};
  return { ...queryState, data: availableBatches };
};
