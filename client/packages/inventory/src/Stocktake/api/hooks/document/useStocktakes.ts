import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useStocktakes = () => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [{ key: 'status', condition: 'equalTo' }],
  });
  const api = useStocktakeApi();

  return {
    ...useQuery({
      queryKey: api.keys.paramList(queryParams),
      queryFn: api.get.list(queryParams)
    }),
  };
};
