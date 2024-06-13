import { useMutation, useQueryClient } from '@openmsupply-client/common';
import { NAME_PROPERTIES_KEY } from '@openmsupply-client/system';
import { useHostApi } from '../utils/useHostApi';
import { gapsNameProperties } from './namePropertyData';

export const useConfigureNameProperties = () => {
  const api = useHostApi();
  const queryClient = useQueryClient();

  return useMutation(() => api.configureNameProperties(gapsNameProperties), {
    onSuccess: () => queryClient.invalidateQueries(NAME_PROPERTIES_KEY),
  });
};
