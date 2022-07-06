import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useMasterListApi } from '../utils/useMasterListApi';

export const useMasterLists = ({ enabled } = { enabled: true }) => {
  const { queryParams } = useUrlQueryParams({
    filterKey: 'name',
    initialSort: 'name',
  });
  const api = useMasterListApi();

  return {
    ...useQuery(
      api.keys.paramList(queryParams),
      () => api.get.list(queryParams),
      {
        enabled,
      }
    ),
  };
};
