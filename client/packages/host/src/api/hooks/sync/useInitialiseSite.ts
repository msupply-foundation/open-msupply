import { useMutation } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useInitialiseSite = () => {
  const api = useHostApi();
  return useMutation(api.initialise);
};
