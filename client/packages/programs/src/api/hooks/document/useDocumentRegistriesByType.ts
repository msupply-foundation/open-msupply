import { useQuery } from '@openmsupply-client/common';

import { useDocumentRegistryApi } from '../utils/useDocumentRegistryApi';

export const useDocumentRegistryByType = (type: string, enabled?: boolean) => {
  const api = useDocumentRegistryApi();

  return useQuery(
    api.keys.byDocType(type),
    () => api.get.byDocType(type),
    // Don't refetch when the edit modal opens, for example. But, don't cache
    // data when this query is inactive. For example, when navigating away from
    // the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
      enabled,
    }
  );
};
