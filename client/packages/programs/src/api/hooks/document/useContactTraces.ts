import { useQuery } from '@openmsupply-client/common';
import { ContactTraceListParams } from '../../api';
import { useContactTraceApi } from '../utils/useContactTraceApi';

export const useContactTraces = (
  params: ContactTraceListParams,
  enabled?: boolean
) => {
  const api = useContactTraceApi();

  return useQuery({
    queryKey: api.keys.list(params),
    queryFn: () => api.list(params),
    enabled
  });
};
