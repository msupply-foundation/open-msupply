import { useQuery } from '@openmsupply-client/common';
import { useFormSchemaApi } from '../utils/useFormSchemaApi';

export const useFormSchemaByType = (type: string | undefined) => {
  const api = useFormSchemaApi();

  return useQuery({
    queryKey: api.keys.byType(type ?? ''),
    queryFn: () => api.get.byType(type ?? ''),
    refetchOnMount: false,
    gcTime: 0,
    enabled: !!type
  });
};
