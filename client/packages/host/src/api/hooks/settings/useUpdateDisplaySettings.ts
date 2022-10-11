import { useMutation } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useDisplaySettings = () => {
  const api = useHostApi();
  // return useMutation(api.updateDisplaySettings);
  return useMutation(api.update);
};
