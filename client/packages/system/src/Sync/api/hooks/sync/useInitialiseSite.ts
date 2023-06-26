import { useMutation } from '@openmsupply-client/common';
import { useSyncApi } from '../utils/useSyncApi';

export const useInitialiseSite = () => {
  const api = useSyncApi();
  return useMutation(api.initialise);
};
