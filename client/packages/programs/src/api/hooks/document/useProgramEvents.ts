import { useQuery } from '@openmsupply-client/common';
import { ProgramEventParams } from '../../api';
import { useProgramEventApi } from '../utils/useProgramEventApi';

export const useProgramEvents = (
  params: ProgramEventParams,
  enabled?: boolean
) => {
  const api = useProgramEventApi();

  return useQuery({
    queryKey: api.keys.list(params),
    queryFn: () => api.activeProgramEvents(params),
    refetchOnMount: false,
    gcTime: 0,
    enabled
  });
};
