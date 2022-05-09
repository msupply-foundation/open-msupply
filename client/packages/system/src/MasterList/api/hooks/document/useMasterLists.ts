import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useMasterListApi } from '../utils/useMasterListApi';

export const useMasterLists = ({ enabled } = { enabled: true }) => {
  const queryParams = useQueryParamsStore();
  const api = useMasterListApi();

  return {
    ...useQuery(
      api.keys.paramList(queryParams.paramList()),
      () => api.get.list(queryParams.paramList()),
      {
        enabled,
      }
    ),
    ...queryParams,
  };
};
