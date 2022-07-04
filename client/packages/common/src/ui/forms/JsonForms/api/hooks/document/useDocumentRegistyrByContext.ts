import {
  DocumentRegistryNodeContext,
  useQuery,
} from '@openmsupply-client/common';
import { useDocumentRegistryApi } from '../utils/useDocumentRegistryApi';

export const useDocumentRegistryByContext = (
  context: DocumentRegistryNodeContext,
  enabled?: boolean
) => {
  const api = useDocumentRegistryApi();

  return useQuery(
    api.keys.detail(context),
    () => api.get.byDocContext(context),
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
