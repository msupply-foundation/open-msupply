import { useMutation } from '@openmsupply-client/common';
import { useSyncApi } from '../utils/useSyncApi';

export const useInitialiseAsCentralServer = () => {
  const api = useSyncApi();
  return useMutation(api.initialiseAsCentralServer);
};
