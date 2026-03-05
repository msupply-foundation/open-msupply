import { useQuery } from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';
import { ListParams } from '../../api';

export const useRequests = (
  queryParams: ListParams,
  options?: { enabled: boolean }
) => {
  const api = useRequestApi();

  return {
    ...useQuery({
      queryKey: api.keys.paramList(queryParams),
      queryFn: () => api.get.list(queryParams),
      keepPreviousData: true,
      ...options
    }),
  };
};
