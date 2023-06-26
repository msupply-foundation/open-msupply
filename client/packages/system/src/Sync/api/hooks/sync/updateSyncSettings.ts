import { useMutation } from '@openmsupply-client/common';
import { useSyncApi } from '../utils/useSyncApi';

export const useUpdateSyncSettings = () => {
  const api = useSyncApi();
  return useMutation(api.update);
};
