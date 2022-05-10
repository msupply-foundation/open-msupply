import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useStocktakes = () => {
  const queryParams = useQueryParamsStore();
  const api = useStocktakeApi();

  return {
    ...useQuery(
      api.keys.paramList(queryParams.paramList()),
      api.get.list(queryParams.paramList())
    ),
    ...queryParams,
  };
};
