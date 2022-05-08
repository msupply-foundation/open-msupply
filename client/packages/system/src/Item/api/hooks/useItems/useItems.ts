import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useItemApi } from '../useItemApi';

export const useItems = () => {
  const queryParams = useQueryParamsStore();
  const api = useItemApi();

  return {
    ...useQuery(api.keys.paramList(queryParams.paramList()), () =>
      api.get.list(queryParams.paramList())
    ),
    ...queryParams,
  };
};
