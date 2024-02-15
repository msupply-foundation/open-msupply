import { useQuery } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useDatabaseSettings = () => {
  const api = useHostApi();
  return useQuery(api.keys.databaseSettings(), async () =>
    api.get.databaseSettings()
  );
};
