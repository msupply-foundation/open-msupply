import { useQuery } from '@openmsupply-client/common';
import { usePatientDocumentApi } from '../utils/useDocumentApi';

export const useDocumentByName = (name: string | undefined) => {
  const api = usePatientDocumentApi();

  return useQuery(
    api.keys.byName(name ?? ''),
    () => api.get.byDocName(name ?? ''),
    // Don't refetch when the edit modal opens, for example. But, don't cache
    // data when this query is inactive. For example, when navigating away from
    // the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
      enabled: !!name,
    }
  );
};
