import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';
import { useStocktakeId } from '../document/useStocktake';

export const useStocktakeLines = (id: string) => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'itemName', dir: 'asc' },
    filters: [{ key: 'itemCodeOrName' }],
  });
  const api = useStocktakeApi();
  const stocktakeId = useStocktakeId();

  return useQuery(api.keys.lines(stocktakeId, queryParams), () =>
    api.get.lines(id, queryParams)
  );
};
