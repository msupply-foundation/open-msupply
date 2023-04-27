import { useQuery } from '@openmsupply-client/common';
import { useOutboundApi } from './useOutboundApi';

export const useResponseCounts = () => {
  const api = useOutboundApi();

  return useQuery(api.keys.responseCount(), api.dashboard.requisitionCount, {
    retry: false,
    onError: () => {},
  });
};
