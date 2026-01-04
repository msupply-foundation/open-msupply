import { useQuery } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { ListParams } from '../../api';

export const useInbounds = (queryParams: ListParams) => {
  const api = useInboundApi();

  return {
    ...useQuery(
      api.keys.paramList(queryParams),
      () => api.get.list(queryParams),
      { keepPreviousData: true }
    ),
  };
};
