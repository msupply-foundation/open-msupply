import { useQuery } from '@openmsupply-client/common';
import { ContactTraceListParams } from '../../api';
import { useContactTraceApi } from '../utils/useContactTraceApi';

export const useContactTraces = (
  params: ContactTraceListParams,
  enabled?: boolean
) => {
  const api = useContactTraceApi();

  return useQuery(api.keys.list(params), () => api.list(params), {
    enabled,
  });
};
