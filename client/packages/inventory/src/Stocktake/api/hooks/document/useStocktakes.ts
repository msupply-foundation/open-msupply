import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useStocktakes = () => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { sort: 'createdDatetime', dir: 'desc' },
    filterKey: 'status',
    filterCondition: 'equalTo',
  });
  const api = useStocktakeApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), api.get.list(queryParams)),
  };
};
