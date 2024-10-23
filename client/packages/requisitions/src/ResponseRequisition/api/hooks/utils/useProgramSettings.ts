import { useQuery } from '@openmsupply-client/common';
import { useResponseApi } from './useResponseApi';

export const useProgramSettings = () => {
  const api = useResponseApi();

  return useQuery(api.keys.programSettings(), () => api.programSettings());
};
