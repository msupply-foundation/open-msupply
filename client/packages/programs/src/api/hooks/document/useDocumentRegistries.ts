import { useQuery } from '@openmsupply-client/common';
import { DocumentRegistryParams } from '../../api';

import { useDocumentRegistryApi } from '../utils/useDocumentRegistryApi';

export const useDocumentRegistries = (enabled?: boolean) => {
  const api = useDocumentRegistryApi();
  const params: DocumentRegistryParams = {
    sortBy: { key: 'context', direction: 'asc' },
  };

  return useQuery(
    api.keys.documentRegistries(params),
    () => api.get.documentRegistries(params),
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
