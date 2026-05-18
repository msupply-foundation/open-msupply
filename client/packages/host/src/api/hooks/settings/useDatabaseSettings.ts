import { useQuery } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useDatabaseSettings = () => {
  const api = useHostApi();
  return useQuery({
    queryKey: api.keys.databaseSettings(),

    queryFn: async () =>
      api.get.databaseSettings()
  });
};
