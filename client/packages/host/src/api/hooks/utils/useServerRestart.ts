import { useMutation } from '@openmsupply-client/common';
import { useHostApi } from './useHostApi';

export const useServerRestart = () => {
  const api = useHostApi();
  return useMutation<string, unknown, void, unknown>(api.update.restart);
};
