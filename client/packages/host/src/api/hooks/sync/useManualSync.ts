import { useMutation } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useManualSync = () => {
  const api = useHostApi();
  return useMutation(api.manualSync);
};
