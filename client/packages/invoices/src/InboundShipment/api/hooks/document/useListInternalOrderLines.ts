import { useQuery } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useListInternalOrderLines = (requisitionId: string) => {
  const api = useInboundApi();

  return {
    ...useQuery(
      api.keys.listInternalOrderLines(requisitionId),
      () => api.get.listInternalOrderLines(requisitionId),
      { enabled: !!requisitionId }
    ),
  };
};
