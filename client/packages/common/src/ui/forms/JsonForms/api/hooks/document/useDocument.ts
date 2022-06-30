import { useQuery } from '@openmsupply-client/common';
import { useDocumentApi } from '../utils/useDocumentApi';

export const useDocument = (docName: string) => {
  const api = useDocumentApi();

  return useQuery(
    api.keys.detail(docName),
    () => api.get.byDocName(docName),
    // Don't refetch when the edit modal opens, for example. But, don't cache
    // data when this query is inactive. For example, when navigating away from
    // the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
