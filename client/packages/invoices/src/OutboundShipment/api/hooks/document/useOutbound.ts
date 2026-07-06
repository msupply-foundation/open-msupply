import { useQuery } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutboundId } from '../utils/useOutboundId';

export const useOutbound = () => {
  const id = useOutboundId();
  const api = useOutboundApi();

  return useQuery({
    queryKey: api.keys.detail(id),
    queryFn: () => api.get.byId(id),
    refetchOnMount: false,
    gcTime: 0
  });
};
