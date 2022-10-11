import { useMutation } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useUpdateDisplaySettings = () => {
  const api = useHostApi();
  return useMutation(api.updateDisplaySettings);
};
