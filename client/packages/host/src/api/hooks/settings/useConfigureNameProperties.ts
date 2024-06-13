import { useMutation } from '@openmsupply-client/common';
import { useHostApi } from '../utils/useHostApi';
import { gapsNameProperties } from './namePropertyData';

export const useConfigureNameProperties = () => {
  const api = useHostApi();
  return useMutation(() => api.configureNameProperties(gapsNameProperties));
};
