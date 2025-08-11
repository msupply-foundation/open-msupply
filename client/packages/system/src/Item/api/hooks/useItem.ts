import { useParams, useQuery } from '@openmsupply-client/common';
import { useItemGraphQL } from '../useItemGraphQL';
import { ITEM } from '../keys';

export function useItem(id?: string) {
  const { data, isLoading, error } = useGetById(id);
  const { data: stockLinesFromItem, isLoading: stockLinesIsLoading } =
    useStockLinesFromItem(id);

  return {
    byId: { data, isLoading, error },
    stockLinesFromItem: {
      data: stockLinesFromItem,
      isLoading: stockLinesIsLoading,
    },
  };
}

const useGetById = (itemId?: string) => {
  const { api, storeId } = useItemGraphQL();
  const { id = '' } = useParams();

  const queryFn = async () => {
    const result = await api.itemById({
      storeId,
      itemId: itemId || id,
    });

    if (result.items.__typename === 'ItemConnector') {
      return result.items.nodes[0];
    }
  };

  const query = useQuery({
    queryKey: [ITEM, id],
    queryFn,
    enabled: !!id,
  });

  return query;
};

const useStockLinesFromItem = (itemId?: string) => {
  const queryState = useGetById(itemId);
  const { data } = queryState;
  const { availableBatches } = data ?? {};
  return { ...queryState, data: availableBatches };
};
