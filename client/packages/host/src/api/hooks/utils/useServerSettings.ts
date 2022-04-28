import {
  ServerSettingsNode,
  useQuery,
  UseQueryOptions,
} from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useServerSettings = (
  options?: Omit<
    UseQueryOptions<unknown, unknown, ServerSettingsNode, readonly string[]>,
    'queryKey' | 'queryFn'
  >
) => {
  const api = useHostApi();
  return useQuery<unknown, unknown, ServerSettingsNode, readonly string[]>(
    api.keys.settings(),
    api.get.settings,
    {
      cacheTime: 0,
      ...options,
    }
  );
};
