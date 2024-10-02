import { useMutation } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';

export const useGenerateOneOffReport = () => {
  const api = useHostApi();
  return useMutation(api.generateOneOffReport);
};
