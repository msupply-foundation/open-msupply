import { useMutation } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useUpdateSyncSettings = () => {
  const api = useHostApi();
  return useMutation(api.update);
};
