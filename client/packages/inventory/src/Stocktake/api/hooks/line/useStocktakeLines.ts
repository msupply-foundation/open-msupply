import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';
import { useStocktakeNumber } from '../document/useStocktake';

export const useStocktakeLines = (id: string) => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'itemName', dir: 'asc' },
    filters: [{ key: 'itemCodeOrName' }],
  });
  const api = useStocktakeApi();
  const stocktakeNumber = useStocktakeNumber();

  return useQuery(api.keys.lines(stocktakeNumber, queryParams), () =>
    api.get.lines(id, queryParams)
  );
};
