import { useQuery } from '@openmsupply-client/common';
import { ProgramEventParams } from '../../api';
import { useProgramEventApi } from '../utils/useProgramEventApi';

export const useProgramEvents = (
  params: ProgramEventParams,
  enabled?: boolean
) => {
  const api = useProgramEventApi();

  return useQuery(
    api.keys.list(params),
    () => api.programEvents(params),
    // Don't refetch when the edit modal opens, for example. But, don't cache
    // data when this query is inactive. For example, when navigating away from
    // the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
      enabled,
    }
  );
};
