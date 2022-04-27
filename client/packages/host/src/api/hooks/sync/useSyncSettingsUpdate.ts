import {
  ServerSettingsNode,
  UpdateSyncSettingsInput,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useSyncSettingsUpdate = () => {
  const queryClient = useQueryClient();
  const api = useHostApi();
  return useMutation<
    ServerSettingsNode,
    unknown,
    UpdateSyncSettingsInput,
    unknown
  >(api.update.syncSettings, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
