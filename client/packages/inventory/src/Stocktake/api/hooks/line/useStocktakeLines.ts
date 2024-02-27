import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useStocktakeLines = (id: string) => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'itemName', dir: 'asc' },
    filters: [{ key: 'itemCodeOrName' }],
  });
  const api = useStocktakeApi();

  return {
    ...useQuery(api.keys.lines(id, queryParams), () =>
      api.get.lines(id, queryParams)
    ),
  };
};
