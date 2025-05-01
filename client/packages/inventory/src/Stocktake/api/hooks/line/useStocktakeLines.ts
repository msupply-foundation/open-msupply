import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';
import { useStocktakeNumber } from '../document/useStocktake';

export const useStocktakeLines = (id: string, itemCode?: string) => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'itemName', dir: 'asc' },
    filters: [{ key: 'itemCodeOrName' }],
  });

  if (itemCode) {
    queryParams.filterBy = {
      ...queryParams.filterBy,
      itemCodeOrName: { equalTo: itemCode },
    };
    // We use itemCode when we want to get all the lines for a specific item
    // Get 1000 lines back, assuming that there's never more than 1000 lines for a single item
    queryParams.first = 1000;
    queryParams.offset = 0;
  }

  const api = useStocktakeApi();
  const stocktakeNumber = useStocktakeNumber();

  return useQuery(api.keys.lines(stocktakeNumber, queryParams), () =>
    api.get.lines(id, queryParams)
  );
};
