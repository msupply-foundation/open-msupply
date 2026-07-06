import { useQuery } from '@openmsupply-client/common';
import { useDocumentRegistryApi } from '../utils/useDocumentRegistryApi';

export const useProgramRegistries = () => {
  const api = useDocumentRegistryApi();

  return useQuery({
    queryKey: api.keys.programRegistries(),
    queryFn: () => api.get.programRegistries(),
    refetchOnMount: false,
    gcTime: 0
  });
};
