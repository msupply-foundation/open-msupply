import { useQuery } from '@openmsupply-client/common';
import { useRequestApi } from './useRequestApi';

export const useProgramSettings = () => {
  const api = useRequestApi();

  return useQuery({
    queryKey: api.keys.programSettings(),
    queryFn: () => api.programSettings()
  });
};
