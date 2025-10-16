import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';
import { useStocktakeId } from '../document/useStocktake';

export const useStocktakeLines = (id: string, itemId?: string) => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'itemName', dir: 'asc' },
    filters: [{ key: 'itemCodeOrName' }],
  });

  if (itemId) {
    queryParams.filterBy = {
      ...queryParams.filterBy,
      itemId: { equalTo: itemId },
    };
    // When filtering by itemId, fetch up to 1000 lines and reset offset
    queryParams.first = 1000;
    queryParams.offset = 0;
  }

  const api = useStocktakeApi();
  const stocktakeId = useStocktakeId();

  return useQuery(
    api.keys.lines(stocktakeId, queryParams),
    () => api.get.lines(id, queryParams),
    { enabled: !!id }
  );
};
