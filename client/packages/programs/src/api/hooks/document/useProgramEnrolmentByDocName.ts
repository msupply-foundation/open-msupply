import { useQuery } from '@openmsupply-client/common';
import { useProgramEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export const useProgramEnrolmentByDocName = (
  documentName: string | undefined
) => {
  const api = useProgramEnrolmentApi();

  return useQuery({
    queryKey: api.keys.byDocName(documentName ?? ''),
    // Coalesce to null: api.byDocName returns undefined when no enrolment
    // matches, which TanStack Query forbids and would crash the page.
    queryFn: async () => (await api.byDocName(documentName ?? '')) ?? null,
    enabled: !!documentName
  });
};
