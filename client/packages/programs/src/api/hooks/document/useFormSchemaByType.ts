import { useQuery } from '@openmsupply-client/common';
import { useFormSchemaApi } from '../utils/useFormSchemaApi';

export const useFormSchemaByType = (type: string | undefined) => {
  const api = useFormSchemaApi();

  return useQuery(
    api.keys.byType(type ?? ''),
    () => api.get.byType(type ?? ''),
    // Don't refetch when the edit modal opens, for example. But, don't cache
    // data when this query is inactive. For example, when navigating away from
    // the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
      enabled: !!type,
    }
  );
};
