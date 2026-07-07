import { useQuery } from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';
import { useStocktakeId } from '../document/useStocktake';

export const useStocktakeLines = (id: string, itemId?: string) => {
  const queryParams = {
    sortBy: { key: 'itemName', isDesc: false, direction: 'asc' as const },

    ...(itemId ? { filterBy: { itemId: { equalTo: itemId } } } : {}),
  };

  const api = useStocktakeApi();
  const stocktakeId = useStocktakeId();

  return useQuery({
    queryKey: api.keys.lines(stocktakeId, queryParams),
    queryFn: () => api.get.lines(id, queryParams),
    enabled: !!id
  });
};
