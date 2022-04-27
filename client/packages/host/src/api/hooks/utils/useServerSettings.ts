import {
  ServerSettingsNode,
  useQuery,
  UseQueryResult,
} from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useServerSettings = (): UseQueryResult<ServerSettingsNode> => {
  const api = useHostApi();
  return useQuery(api.keys.settings(), api.get.settings, {
    cacheTime: 0,
  });
};
