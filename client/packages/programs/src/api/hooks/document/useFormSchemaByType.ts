import { useQuery } from '@openmsupply-client/common';
import { useFormSchemaApi } from '../utils/useFormSchemaApi';

export const useFormSchemaByType = (type: string | undefined) => {
  const api = useFormSchemaApi();

  return useQuery({
    queryKey: api.keys.byType(type ?? ''),
    // Coalesce to null: api.get.byType returns undefined when no schema
    // matches, which TanStack Query forbids and would crash the page.
    queryFn: async () => (await api.get.byType(type ?? '')) ?? null,
    refetchOnMount: false,
    gcTime: 0,
    enabled: !!type
  });
};
